import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  webhookPayloadSchema,
  registerSchema,
  loginSchema,
  createServerSchema,
  verifyEmailSchema,
  changePasswordSchema,
  confirmPasswordChangeSchema,
  changeEmailSchema,
  confirmEmailChangeSchema,
  addServerAdminSchema,
} from "@shared/schema";
import { passport, hashPassword, verifyPassword } from "./auth";
import {
  sendVerificationEmail,
  sendPasswordChangeEmail,
  sendEmailChangeEmail,
  generateVerificationCode,
} from "./email";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { email, password, name } = parseResult.data;

      const existingAdmin = await storage.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const admin = await storage.createAdmin({ email, passwordHash, name });

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.deleteVerificationTokensByType(
        admin.id,
        "email_verification"
      );
      await storage.createVerificationToken({
        adminId: admin.id,
        code,
        type: "email_verification",
        expiresAt,
      });

      const emailSent = await sendVerificationEmail(email, code, name);

      req.login(admin, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Login failed after registration" });
        }
        return res.json({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          isEmailVerified: admin.isEmailVerified,
          emailSent,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parseResult.error.errors });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res
          .status(401)
          .json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      return res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        isEmailVerified: req.user.isEmailVerified,
      });
    }
    return res.status(401).json({ error: "Not authenticated" });
  });

  app.post("/api/auth/verify-email", requireAuth, async (req, res) => {
    try {
      const parseResult = verifyEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { code } = parseResult.data;
      const token = await storage.getVerificationToken(
        req.user!.id,
        "email_verification",
        code
      );

      if (!token) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification code" });
      }

      const updatedAdmin = await storage.verifyAdminEmail(req.user!.id);
      await storage.deleteVerificationTokensByType(
        req.user!.id,
        "email_verification"
      );

      if (updatedAdmin) {
        await new Promise<void>((resolve) => {
          req.login(updatedAdmin, (err) => {
            if (err) {
              console.error("Session refresh error:", err);
            }
            resolve();
          });
        });
      }

      return res.json({
        success: true,
        message: "Email verified successfully",
        isEmailVerified: true,
      });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.user!.id);
      if (!admin) {
        return res.status(404).json({ error: "User not found" });
      }

      if (admin.isEmailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.deleteVerificationTokensByType(
        admin.id,
        "email_verification"
      );
      await storage.createVerificationToken({
        adminId: admin.id,
        code,
        type: "email_verification",
        expiresAt,
      });

      const emailSent = await sendVerificationEmail(
        admin.email,
        code,
        admin.name
      );

      res.json({ success: true, emailSent });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const parseResult = changePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { currentPassword, newPassword } = parseResult.data;
      const admin = await storage.getAdminById(req.user!.id);

      if (!admin) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await verifyPassword(currentPassword, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const newPasswordHash = await hashPassword(newPassword);

      await storage.deleteVerificationTokensByType(admin.id, "password_change");
      await storage.createVerificationToken({
        adminId: admin.id,
        code,
        type: "password_change",
        newPasswordHash,
        expiresAt,
      });

      const emailSent = await sendPasswordChangeEmail(
        admin.email,
        code,
        admin.name
      );

      res.json({
        success: true,
        emailSent,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to initiate password change" });
    }
  });

  app.post(
    "/api/auth/confirm-password-change",
    requireAuth,
    async (req, res) => {
      try {
        const parseResult = confirmPasswordChangeSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: "Invalid input",
            details: parseResult.error.errors,
          });
        }

        const { code } = parseResult.data;
        const token = await storage.getVerificationToken(
          req.user!.id,
          "password_change",
          code
        );

        if (!token || !token.newPasswordHash) {
          return res
            .status(400)
            .json({ error: "Invalid or expired verification code" });
        }

        await storage.updateAdminPassword(req.user!.id, token.newPasswordHash);
        await storage.deleteVerificationTokensByType(
          req.user!.id,
          "password_change"
        );

        res.json({ success: true, message: "Password changed successfully" });
      } catch (error) {
        console.error("Confirm password change error:", error);
        res.status(500).json({ error: "Failed to change password" });
      }
    }
  );

  app.post("/api/auth/change-email", requireAuth, async (req, res) => {
    try {
      const parseResult = changeEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { newEmail, password } = parseResult.data;
      const admin = await storage.getAdminById(req.user!.id);

      if (!admin) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await verifyPassword(password, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: "Password is incorrect" });
      }

      const existingAdmin = await storage.getAdminByEmail(newEmail);
      if (existingAdmin) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.deleteVerificationTokensByType(admin.id, "email_change");
      await storage.createVerificationToken({
        adminId: admin.id,
        code,
        type: "email_change",
        newEmail,
        expiresAt,
      });

      const emailSent = await sendEmailChangeEmail(newEmail, code, admin.name);

      res.json({
        success: true,
        emailSent,
        message: "Verification code sent to new email",
      });
    } catch (error) {
      console.error("Change email error:", error);
      res.status(500).json({ error: "Failed to initiate email change" });
    }
  });

  app.post("/api/auth/confirm-email-change", requireAuth, async (req, res) => {
    try {
      const parseResult = confirmEmailChangeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { code } = parseResult.data;
      const token = await storage.getVerificationToken(
        req.user!.id,
        "email_change",
        code
      );

      if (!token || !token.newEmail) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification code" });
      }

      const updatedAdmin = await storage.updateAdminEmail(
        req.user!.id,
        token.newEmail
      );
      await storage.deleteVerificationTokensByType(
        req.user!.id,
        "email_change"
      );

      if (updatedAdmin) {
        await new Promise<void>((resolve) => {
          req.login(updatedAdmin, (err) => {
            if (err) {
              console.error("Session refresh error:", err);
            }
            resolve();
          });
        });
      }

      return res.json({
        success: true,
        message: "Email changed successfully",
        newEmail: token.newEmail,
        isEmailVerified: false,
      });
    } catch (error) {
      console.error("Confirm email change error:", error);
      return res.status(500).json({ error: "Failed to change email" });
    }
  });

  app.get("/api/servers", requireAuth, async (req, res) => {
    try {
      const servers = await storage.getServersByAdminId(req.user!.id);
      res.json(servers);
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  app.post("/api/servers", requireAuth, async (req, res) => {
    try {
      const parseResult = createServerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const server = await storage.createServer(
        req.user!.id,
        parseResult.data.name
      );
      res.json(server);
    } catch (error) {
      console.error("Error creating server:", error);
      res.status(500).json({ error: "Failed to create server" });
    }
  });

  app.post(
    "/api/servers/:id/regenerate-webhook",
    requireAuth,
    async (req, res) => {
      try {
        const serverId = parseInt(req.params.id, 10);
        if (isNaN(serverId)) {
          return res.status(400).json({ error: "Invalid server ID" });
        }

        const server = await storage.regenerateWebhookId(
          serverId,
          req.user!.id
        );
        if (!server) {
          return res.status(404).json({ error: "Server not found" });
        }

        res.json(server);
      } catch (error) {
        console.error("Error regenerating webhook:", error);
        res.status(500).json({ error: "Failed to regenerate webhook" });
      }
    }
  );

  app.delete("/api/servers/:id", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id, 10);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const deleted = await storage.deleteServer(serverId, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ error: "Server not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting server:", error);
      res.status(500).json({ error: "Failed to delete server" });
    }
  });

  app.get("/api/servers/:id/players", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id, 10);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const hasAccess = await storage.isServerAdmin(serverId, req.user!.id);
      if (!hasAccess) {
        return res.status(404).json({ error: "Server not found" });
      }

      const players = await storage.getPlayersByServerId(serverId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get(
    "/api/servers/:serverId/players/:playerId/snapshots",
    requireAuth,
    async (req, res) => {
      try {
        const serverId = parseInt(req.params.serverId, 10);
        const playerId = parseInt(req.params.playerId, 10);
        if (isNaN(serverId) || isNaN(playerId)) {
          return res.status(400).json({ error: "Invalid ID" });
        }

        const hasAccess = await storage.isServerAdmin(serverId, req.user!.id);
        if (!hasAccess) {
          return res.status(404).json({ error: "Server not found" });
        }

        const player = await storage.getPlayerById(playerId);
        if (!player || player.serverId !== serverId) {
          return res.status(404).json({ error: "Player not found" });
        }

        const limit = req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : 100;
        const days = req.query.days
          ? parseInt(req.query.days as string, 10)
          : undefined;
        const snapshots = await storage.getPlayerSnapshots(
          playerId,
          limit,
          days
        );
        res.json(snapshots);
      } catch (error) {
        console.error("Error fetching snapshots:", error);
        res.status(500).json({ error: "Failed to fetch snapshots" });
      }
    }
  );

  app.post("/api/servers/:id/admins", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id, 10);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const isOwner = await storage.isServerOwner(serverId, req.user!.id);
      if (!isOwner) {
        return res
          .status(403)
          .json({ error: "Only server owner can add admins" });
      }

      const parseResult = addServerAdminSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const adminToAdd = await storage.getAdminByEmail(parseResult.data.email);
      if (!adminToAdd) {
        return res
          .status(404)
          .json({ error: "User not found with this email" });
      }

      if (adminToAdd.id === req.user!.id) {
        return res.status(400).json({ error: "You are already the owner" });
      }

      const added = await storage.addServerAdmin(serverId, adminToAdd.id);
      if (!added) {
        return res
          .status(400)
          .json({ error: "User is already an admin of this server" });
      }

      res.json({
        success: true,
        admin: {
          id: adminToAdd.id,
          email: adminToAdd.email,
          name: adminToAdd.name,
        },
      });
    } catch (error) {
      console.error("Error adding server admin:", error);
      res.status(500).json({ error: "Failed to add admin" });
    }
  });

  app.delete(
    "/api/servers/:id/admins/:adminId",
    requireAuth,
    async (req, res) => {
      try {
        const serverId = parseInt(req.params.id, 10);
        const adminIdToRemove = parseInt(req.params.adminId, 10);
        if (isNaN(serverId) || isNaN(adminIdToRemove)) {
          return res.status(400).json({ error: "Invalid ID" });
        }

        const isOwner = await storage.isServerOwner(serverId, req.user!.id);
        if (!isOwner) {
          return res
            .status(403)
            .json({ error: "Only server owner can remove admins" });
        }

        const removed = await storage.removeServerAdmin(
          serverId,
          adminIdToRemove
        );
        if (!removed) {
          return res.status(404).json({ error: "Admin not found" });
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error removing server admin:", error);
        res.status(500).json({ error: "Failed to remove admin" });
      }
    }
  );

  app.get("/api/servers/:id/admins", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id, 10);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const hasAccess = await storage.isServerAdmin(serverId, req.user!.id);
      if (!hasAccess) {
        return res.status(404).json({ error: "Server not found" });
      }

      const server = await storage.getServerById(serverId);
      const admins = await storage.getServerAdmins(serverId);

      const owner = await storage.getAdminById(server!.adminId);
      const allAdmins = [
        {
          adminId: owner!.id,
          email: owner!.email,
          name: owner!.name,
          role: "owner",
        },
        ...admins.map((a) => ({
          adminId: a.adminId,
          email: a.email,
          name: a.name,
          role: a.role,
        })),
      ];

      res.json(allAdmins);
    } catch (error) {
      console.error("Error fetching server admins:", error);
      res.status(500).json({ error: "Failed to fetch admins" });
    }
  });

  app.post("/api/webhook/:webhookId", async (req, res) => {
    try {
      const { webhookId } = req.params;

      const server = await storage.getServerByWebhookId(webhookId);
      if (!server) {
        return res.status(404).json({ error: "Invalid webhook URL" });
      }

      if (!server.isActive) {
        return res.status(403).json({ error: "Server is deactivated" });
      }

      const parseResult = webhookPayloadSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error("Webhook validation error:", parseResult.error);
        return res.status(400).json({
          error: "Invalid payload format",
          details: parseResult.error.errors,
        });
      }

      const payload = parseResult.data;
      const processedPlayers: string[] = [];

      for (const playerData of payload.Players) {
        let player = await storage.getPlayerBySteamIdAndServerId(
          playerData.ID,
          server.id
        );

        if (!player) {
          player = await storage.createPlayer({
            serverId: server.id,
            steamId: playerData.ID,
            name: playerData.Name,
          });
        } else {
          await storage.updatePlayerLastSeen(player.id);
        }

        await storage.createPlayerSnapshot({
          playerId: player.id,
          serverDate: payload.ServerDate,
          health: playerData.Health,
          blood: playerData.Blood,
          shock: playerData.Shock,
          water: playerData.Water,
          energy: playerData.Energy,
          heatComfort: playerData.HeatComfort,
          stamina: playerData.Stamina,
          wetness: playerData.Wetness,
          environmentTemp: playerData.EnvironmentTemp,
          playtime: playerData.Playtime,
          distanceWalked: playerData.DistanceWalked,
          killedZombies: playerData.KilledZombies,
          positionX: playerData.Position[0],
          positionY: playerData.Position[1],
          positionZ: playerData.Position[2],
          diseases: playerData.Diseases,
        });

        processedPlayers.push(playerData.Name);
      }

      console.log(
        `Webhook [${server.name}]: ${
          processedPlayers.length
        } players processed - ${processedPlayers.join(", ")}`
      );

      res.json({
        success: true,
        message: `Processed ${processedPlayers.length} players`,
        players: processedPlayers,
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  setInterval(async () => {
    try {
      await storage.deleteExpiredTokens();
    } catch (error) {
      console.error("Failed to clean up expired tokens:", error);
    }
  }, 60 * 60 * 1000);

  storage.deleteExpiredTokens().catch(console.error);

  return httpServer;
}
