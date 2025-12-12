import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, serial, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  name: text("name").notNull(),
  webhookId: varchar("webhook_id", { length: 64 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id),
  steamId: varchar("steam_id", { length: 64 }).notNull(),
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

export const adminsRelations = relations(admins, ({ many }) => ({
  servers: many(servers),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  admin: one(admins, {
    fields: [servers.adminId],
    references: [admins.id],
  }),
  players: many(players),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  server: one(servers, {
    fields: [players.serverId],
    references: [servers.id],
  }),
  snapshots: many(playerSnapshots),
}));

export const playerSnapshotsRelations = relations(playerSnapshots, ({ one }) => ({
  player: one(players, {
    fields: [playerSnapshots.playerId],
    references: [players.id],
  }),
}));

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
  webhookId: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  lastSeen: true,
});

export const insertPlayerSnapshotSchema = createInsertSchema(playerSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
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

export type ServerWithPlayerCount = Server & {
  playerCount: number;
};

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createServerSchema = z.object({
  name: z.string().min(1, "Server name is required").max(100, "Server name too long"),
});
