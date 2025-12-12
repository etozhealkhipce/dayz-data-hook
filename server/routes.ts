import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { webhookPayloadSchema, registerSchema, loginSchema, createServerSchema } from "@shared/schema";
import { passport, hashPassword } from "./auth";

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
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const { email, password, name } = parseResult.data;

      const existingAdmin = await storage.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const admin = await storage.createAdmin({ email, passwordHash, name });

      req.login(admin, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed after registration" });
        }
        return res.json({ 
          id: admin.id, 
          email: admin.email, 
          name: admin.name 
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
      return res.status(400).json({ error: "Invalid input", details: parseResult.error.errors });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          id: user.id, 
          email: user.email, 
          name: user.name 
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
        name: req.user.name 
      });
    }
    return res.status(401).json({ error: "Not authenticated" });
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
        return res.status(400).json({ error: "Invalid input", details: parseResult.error.errors });
      }

      const server = await storage.createServer(req.user!.id, parseResult.data.name);
      res.json(server);
    } catch (error) {
      console.error("Error creating server:", error);
      res.status(500).json({ error: "Failed to create server" });
    }
  });

  app.post("/api/servers/:id/regenerate-webhook", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id, 10);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const server = await storage.regenerateWebhookId(serverId, req.user!.id);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      res.json(server);
    } catch (error) {
      console.error("Error regenerating webhook:", error);
      res.status(500).json({ error: "Failed to regenerate webhook" });
    }
  });

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

      const server = await storage.getServerById(serverId);
      if (!server || server.adminId !== req.user!.id) {
        return res.status(404).json({ error: "Server not found" });
      }

      const players = await storage.getPlayersByServerId(serverId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/servers/:serverId/players/:playerId/snapshots", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId, 10);
      const playerId = parseInt(req.params.playerId, 10);
      if (isNaN(serverId) || isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const server = await storage.getServerById(serverId);
      if (!server || server.adminId !== req.user!.id) {
        return res.status(404).json({ error: "Server not found" });
      }

      const player = await storage.getPlayerById(playerId);
      if (!player || player.serverId !== serverId) {
        return res.status(404).json({ error: "Player not found" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
      const snapshots = await storage.getPlayerSnapshots(playerId, limit, days);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
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
          details: parseResult.error.errors 
        });
      }

      const payload = parseResult.data;
      const processedPlayers: string[] = [];

      for (const playerData of payload.Players) {
        let player = await storage.getPlayerBySteamIdAndServerId(playerData.ID, server.id);
        
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

      console.log(`Webhook [${server.name}]: ${processedPlayers.length} players processed - ${processedPlayers.join(", ")}`);
      
      res.json({ 
        success: true, 
        message: `Processed ${processedPlayers.length} players`,
        players: processedPlayers 
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
