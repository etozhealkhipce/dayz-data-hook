import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  steamId: varchar("steam_id", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const playerSnapshots = pgTable("player_snapshots", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id),
  serverDate: text("server_date").notNull(),
  health: real("health").notNull(),
  blood: real("blood").notNull(),
  shock: real("shock").notNull(),
  water: real("water").notNull(),
  energy: real("energy").notNull(),
  heatComfort: real("heat_comfort").notNull(),
  stamina: real("stamina").notNull(),
  wetness: real("wetness").notNull(),
  environmentTemp: real("environment_temp").notNull(),
  playtime: real("playtime").notNull(),
  distanceWalked: real("distance_walked").notNull(),
  killedZombies: integer("killed_zombies").notNull(),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  diseases: jsonb("diseases").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playersRelations = relations(players, ({ many }) => ({
  snapshots: many(playerSnapshots),
}));

export const playerSnapshotsRelations = relations(playerSnapshots, ({ one }) => ({
  player: one(players, {
    fields: [playerSnapshots.playerId],
    references: [players.id],
  }),
}));

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  lastSeen: true,
});

export const insertPlayerSnapshotSchema = createInsertSchema(playerSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayerSnapshot = z.infer<typeof insertPlayerSnapshotSchema>;
export type PlayerSnapshot = typeof playerSnapshots.$inferSelect;

export const webhookPlayerSchema = z.object({
  Name: z.string(),
  ID: z.string(),
  Health: z.number(),
  Blood: z.number(),
  Shock: z.number(),
  Water: z.number(),
  Energy: z.number(),
  HeatComfort: z.number(),
  Stamina: z.number(),
  Wetness: z.number(),
  EnvironmentTemp: z.number(),
  Playtime: z.number(),
  DistanceWalked: z.number(),
  KilledZombies: z.number(),
  Position: z.tuple([z.number(), z.number(), z.number()]),
  Diseases: z.array(z.string()),
});

export const webhookPayloadSchema = z.object({
  ServerDate: z.string(),
  Players: z.array(webhookPlayerSchema),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type WebhookPlayer = z.infer<typeof webhookPlayerSchema>;

export type PlayerWithLatestSnapshot = Player & {
  latestSnapshot: PlayerSnapshot | null;
};
