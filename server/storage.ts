import {
  admins,
  servers,
  players,
  playerSnapshots,
  type Admin,
  type InsertAdmin,
  type Server,
  type InsertServer,
  type Player,
  type InsertPlayer,
  type PlayerSnapshot,
  type InsertPlayerSnapshot,
  type PlayerWithLatestSnapshot,
  type ServerWithPlayerCount,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAdminById(id: number): Promise<Admin | undefined>;
  
  createServer(adminId: number, name: string): Promise<Server>;
  getServersByAdminId(adminId: number): Promise<ServerWithPlayerCount[]>;
  getServerByWebhookId(webhookId: string): Promise<Server | undefined>;
  getServerById(id: number): Promise<Server | undefined>;
  regenerateWebhookId(serverId: number, adminId: number): Promise<Server | undefined>;
  deleteServer(serverId: number, adminId: number): Promise<boolean>;
  
  getPlayersByServerId(serverId: number): Promise<PlayerWithLatestSnapshot[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  getPlayerBySteamIdAndServerId(steamId: string, serverId: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerLastSeen(id: number): Promise<void>;
  getPlayerSnapshots(playerId: number, limit?: number, days?: number): Promise<PlayerSnapshot[]>;
  createPlayerSnapshot(snapshot: InsertPlayerSnapshot): Promise<PlayerSnapshot>;
}

export class DatabaseStorage implements IStorage {
  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [created] = await db.insert(admins).values(admin).returning();
    return created;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin || undefined;
  }

  async getAdminById(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async createServer(adminId: number, name: string): Promise<Server> {
    const webhookId = nanoid(32);
    const [server] = await db.insert(servers).values({
      adminId,
      name,
      webhookId,
      isActive: true,
    }).returning();
    return server;
  }

  async getServersByAdminId(adminId: number): Promise<ServerWithPlayerCount[]> {
    const serverList = await db.select().from(servers).where(eq(servers.adminId, adminId)).orderBy(desc(servers.createdAt));
    
    const result: ServerWithPlayerCount[] = [];
    for (const server of serverList) {
      const [countResult] = await db.select({ count: count() }).from(players).where(eq(players.serverId, server.id));
      result.push({
        ...server,
        playerCount: countResult?.count || 0,
      });
    }
    return result;
  }

  async getServerByWebhookId(webhookId: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.webhookId, webhookId));
    return server || undefined;
  }

  async getServerById(id: number): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }

  async regenerateWebhookId(serverId: number, adminId: number): Promise<Server | undefined> {
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

  async getPlayersByServerId(serverId: number): Promise<PlayerWithLatestSnapshot[]> {
    const allPlayers = await db.select().from(players).where(eq(players.serverId, serverId)).orderBy(desc(players.lastSeen));
    
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

  async getPlayerBySteamIdAndServerId(steamId: string, serverId: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(
      and(eq(players.steamId, steamId), eq(players.serverId, serverId))
    );
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayerLastSeen(id: number): Promise<void> {
    await db.update(players).set({ lastSeen: new Date() }).where(eq(players.id, id));
  }

  async getPlayerSnapshots(playerId: number, limit: number = 100, days?: number): Promise<PlayerSnapshot[]> {
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

  async createPlayerSnapshot(snapshot: InsertPlayerSnapshot): Promise<PlayerSnapshot> {
    const [created] = await db.insert(playerSnapshots).values(snapshot).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
