import {
  admins,
  servers,
  players,
  playerSnapshots,
  verificationTokens,
  serverAdmins,
  type Admin,
  type InsertAdmin,
  type Server,
  type Player,
  type InsertPlayer,
  type PlayerSnapshot,
  type InsertPlayerSnapshot,
  type PlayerWithLatestSnapshot,
  type ServerWithAdmins,
  type ServerAdminWithEmail,
  type VerificationToken,
  type InsertVerificationToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, count, lt, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAdminById(id: number): Promise<Admin | undefined>;
  updateAdminEmail(adminId: number, email: string): Promise<Admin | undefined>;
  updateAdminPassword(
    adminId: number,
    passwordHash: string
  ): Promise<Admin | undefined>;
  verifyAdminEmail(adminId: number): Promise<Admin | undefined>;

  createVerificationToken(
    token: InsertVerificationToken
  ): Promise<VerificationToken>;
  getVerificationToken(
    adminId: number,
    type: string,
    code: string
  ): Promise<VerificationToken | undefined>;
  deleteVerificationTokensByType(adminId: number, type: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;

  createServer(adminId: number, name: string): Promise<Server>;
  getServersByAdminId(adminId: number): Promise<ServerWithAdmins[]>;
  getServerByWebhookId(webhookId: string): Promise<Server | undefined>;
  getServerById(id: number): Promise<Server | undefined>;
  regenerateWebhookId(
    serverId: number,
    adminId: number
  ): Promise<Server | undefined>;
  deleteServer(serverId: number, adminId: number): Promise<boolean>;

  addServerAdmin(
    serverId: number,
    adminId: number,
    role?: string
  ): Promise<boolean>;
  removeServerAdmin(serverId: number, adminId: number): Promise<boolean>;
  getServerAdmins(serverId: number): Promise<ServerAdminWithEmail[]>;
  isServerAdmin(serverId: number, adminId: number): Promise<boolean>;
  isServerOwner(serverId: number, adminId: number): Promise<boolean>;

  getPlayersByServerId(serverId: number): Promise<PlayerWithLatestSnapshot[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  getPlayerBySteamIdAndServerId(
    steamId: string,
    serverId: number
  ): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerLastSeen(id: number): Promise<void>;
  getPlayerSnapshots(
    playerId: number,
    limit?: number,
    days?: number
  ): Promise<PlayerSnapshot[]>;
  createPlayerSnapshot(snapshot: InsertPlayerSnapshot): Promise<PlayerSnapshot>;
}

export class DatabaseStorage implements IStorage {
  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [created] = await db.insert(admins).values(admin).returning();
    return created;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email));
    return admin || undefined;
  }

  async getAdminById(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async updateAdminEmail(
    adminId: number,
    email: string
  ): Promise<Admin | undefined> {
    const [updated] = await db
      .update(admins)
      .set({ email, isEmailVerified: false })
      .where(eq(admins.id, adminId))
      .returning();
    return updated || undefined;
  }

  async updateAdminPassword(
    adminId: number,
    passwordHash: string
  ): Promise<Admin | undefined> {
    const [updated] = await db
      .update(admins)
      .set({ passwordHash })
      .where(eq(admins.id, adminId))
      .returning();
    return updated || undefined;
  }

  async verifyAdminEmail(adminId: number): Promise<Admin | undefined> {
    const [updated] = await db
      .update(admins)
      .set({ isEmailVerified: true })
      .where(eq(admins.id, adminId))
      .returning();
    return updated || undefined;
  }

  async createVerificationToken(
    token: InsertVerificationToken
  ): Promise<VerificationToken> {
    const [created] = await db
      .insert(verificationTokens)
      .values(token)
      .returning();
    return created;
  }

  async getVerificationToken(
    adminId: number,
    type: string,
    code: string
  ): Promise<VerificationToken | undefined> {
    const [token] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.adminId, adminId),
          eq(verificationTokens.type, type),
          eq(verificationTokens.code, code),
          gte(verificationTokens.expiresAt, new Date())
        )
      );
    return token || undefined;
  }

  async deleteVerificationTokensByType(
    adminId: number,
    type: string
  ): Promise<void> {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.adminId, adminId),
          eq(verificationTokens.type, type)
        )
      );
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(verificationTokens)
      .where(lt(verificationTokens.expiresAt, new Date()));
  }

  async createServer(adminId: number, name: string): Promise<Server> {
    const webhookId = nanoid(32);
    const [server] = await db
      .insert(servers)
      .values({
        adminId,
        name,
        webhookId,
        isActive: true,
      })
      .returning();
    return server;
  }

  async getServersByAdminId(adminId: number): Promise<ServerWithAdmins[]> {
    const ownedServers = await db
      .select()
      .from(servers)
      .where(eq(servers.adminId, adminId));
    const memberServers = await db
      .select({ server: servers })
      .from(serverAdmins)
      .innerJoin(servers, eq(serverAdmins.serverId, servers.id))
      .where(eq(serverAdmins.adminId, adminId));

    const allServerIds = new Set([
      ...ownedServers.map((s) => s.id),
      ...memberServers.map((s) => s.server.id),
    ]);

    const result: ServerWithAdmins[] = [];
    for (const serverId of Array.from(allServerIds)) {
      const server =
        ownedServers.find((s) => s.id === serverId) ||
        memberServers.find((s) => s.server.id === serverId)?.server;
      if (!server) continue;

      const [countResult] = await db
        .select({ count: count() })
        .from(players)
        .where(eq(players.serverId, server.id));
      const serverAdminsList = await this.getServerAdmins(server.id);

      result.push({
        ...server,
        playerCount: countResult?.count || 0,
        admins: serverAdminsList,
        isOwner: server.adminId === adminId,
      });
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getServerByWebhookId(webhookId: string): Promise<Server | undefined> {
    const [server] = await db
      .select()
      .from(servers)
      .where(eq(servers.webhookId, webhookId));
    return server || undefined;
  }

  async getServerById(id: number): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }

  async regenerateWebhookId(
    serverId: number,
    adminId: number
  ): Promise<Server | undefined> {
    const newWebhookId = nanoid(32);
    const [updated] = await db
      .update(servers)
      .set({ webhookId: newWebhookId })
      .where(and(eq(servers.id, serverId), eq(servers.adminId, adminId)))
      .returning();
    return updated || undefined;
  }

  async deleteServer(serverId: number, adminId: number): Promise<boolean> {
    const result = await db
      .delete(servers)
      .where(and(eq(servers.id, serverId), eq(servers.adminId, adminId)))
      .returning();
    return result.length > 0;
  }

  async getPlayersByServerId(
    serverId: number
  ): Promise<PlayerWithLatestSnapshot[]> {
    const allPlayers = await db
      .select()
      .from(players)
      .where(eq(players.serverId, serverId))
      .orderBy(desc(players.lastSeen));

    const result: PlayerWithLatestSnapshot[] = [];

    for (const player of allPlayers) {
      const [latestSnapshot] = await db
        .select()
        .from(playerSnapshots)
        .where(eq(playerSnapshots.playerId, player.id))
        .orderBy(desc(playerSnapshots.createdAt))
        .limit(1);

      result.push({
        ...player,
        latestSnapshot: latestSnapshot || null,
      });
    }

    return result;
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async getPlayerBySteamIdAndServerId(
    steamId: string,
    serverId: number
  ): Promise<Player | undefined> {
    const [player] = await db
      .select()
      .from(players)
      .where(and(eq(players.steamId, steamId), eq(players.serverId, serverId)));
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayerLastSeen(id: number): Promise<void> {
    await db
      .update(players)
      .set({ lastSeen: new Date() })
      .where(eq(players.id, id));
  }

  async getPlayerSnapshots(
    playerId: number,
    limit: number = 100,
    days?: number
  ): Promise<PlayerSnapshot[]> {
    const conditions = [eq(playerSnapshots.playerId, playerId)];

    if (days && days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      conditions.push(gte(playerSnapshots.createdAt, cutoffDate));
    }

    return await db
      .select()
      .from(playerSnapshots)
      .where(and(...conditions))
      .orderBy(desc(playerSnapshots.createdAt))
      .limit(limit);
  }

  async createPlayerSnapshot(
    snapshot: InsertPlayerSnapshot
  ): Promise<PlayerSnapshot> {
    const [created] = await db
      .insert(playerSnapshots)
      .values(snapshot)
      .returning();
    return created;
  }

  async addServerAdmin(
    serverId: number,
    adminId: number,
    role: string = "member"
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(serverAdmins)
      .where(
        and(
          eq(serverAdmins.serverId, serverId),
          eq(serverAdmins.adminId, adminId)
        )
      );

    if (existing.length > 0) return false;

    await db.insert(serverAdmins).values({ serverId, adminId, role });
    return true;
  }

  async removeServerAdmin(serverId: number, adminId: number): Promise<boolean> {
    const result = await db
      .delete(serverAdmins)
      .where(
        and(
          eq(serverAdmins.serverId, serverId),
          eq(serverAdmins.adminId, adminId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getServerAdmins(serverId: number): Promise<ServerAdminWithEmail[]> {
    const result = await db
      .select({
        id: serverAdmins.id,
        serverId: serverAdmins.serverId,
        adminId: serverAdmins.adminId,
        role: serverAdmins.role,
        createdAt: serverAdmins.createdAt,
        email: admins.email,
        name: admins.name,
      })
      .from(serverAdmins)
      .innerJoin(admins, eq(serverAdmins.adminId, admins.id))
      .where(eq(serverAdmins.serverId, serverId));

    return result;
  }

  async isServerAdmin(serverId: number, adminId: number): Promise<boolean> {
    const server = await this.getServerById(serverId);
    if (server?.adminId === adminId) return true;

    const [result] = await db
      .select()
      .from(serverAdmins)
      .where(
        and(
          eq(serverAdmins.serverId, serverId),
          eq(serverAdmins.adminId, adminId)
        )
      );

    return !!result;
  }

  async isServerOwner(serverId: number, adminId: number): Promise<boolean> {
    const server = await this.getServerById(serverId);
    return server?.adminId === adminId;
  }
}

export const storage = new DatabaseStorage();
