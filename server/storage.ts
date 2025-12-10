import {
  players,
  playerSnapshots,
  type Player,
  type InsertPlayer,
  type PlayerSnapshot,
  type InsertPlayerSnapshot,
  type PlayerWithLatestSnapshot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getPlayers(): Promise<PlayerWithLatestSnapshot[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  getPlayerBySteamId(steamId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerLastSeen(id: number): Promise<void>;
  getPlayerSnapshots(playerId: number, limit?: number): Promise<PlayerSnapshot[]>;
  createPlayerSnapshot(snapshot: InsertPlayerSnapshot): Promise<PlayerSnapshot>;
}

export class DatabaseStorage implements IStorage {
  async getPlayers(): Promise<PlayerWithLatestSnapshot[]> {
    const allPlayers = await db.select().from(players).orderBy(desc(players.lastSeen));
    
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

  async getPlayerBySteamId(steamId: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.steamId, steamId));
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayerLastSeen(id: number): Promise<void> {
    await db.update(players).set({ lastSeen: new Date() }).where(eq(players.id, id));
  }

  async getPlayerSnapshots(playerId: number, limit: number = 100): Promise<PlayerSnapshot[]> {
    return await db
      .select()
      .from(playerSnapshots)
      .where(eq(playerSnapshots.playerId, playerId))
      .orderBy(desc(playerSnapshots.createdAt))
      .limit(limit);
  }

  async createPlayerSnapshot(snapshot: InsertPlayerSnapshot): Promise<PlayerSnapshot> {
    const [created] = await db.insert(playerSnapshots).values(snapshot).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
