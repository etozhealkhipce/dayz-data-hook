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
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(), // 'email_verification', 'password_change', 'email_change'
  newEmail: varchar("new_email", { length: 255 }), // for email change requests
  newPasswordHash: text("new_password_hash"), // for password change requests
  expiresAt: timestamp("expires_at").notNull(),
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

export const serverAdmins = pgTable("server_admins", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull().default("member"),
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
  verificationTokens: many(verificationTokens),
  serverAdmins: many(serverAdmins),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  admin: one(admins, {
    fields: [verificationTokens.adminId],
    references: [admins.id],
  }),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  admin: one(admins, {
    fields: [servers.adminId],
    references: [admins.id],
  }),
  players: many(players),
  serverAdmins: many(serverAdmins),
}));

export const serverAdminsRelations = relations(serverAdmins, ({ one }) => ({
  server: one(servers, {
    fields: [serverAdmins.serverId],
    references: [servers.id],
  }),
  admin: one(admins, {
    fields: [serverAdmins.adminId],
    references: [admins.id],
  }),
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
  isEmailVerified: true,
});

export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({
  id: true,
  createdAt: true,
});

export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
  webhookId: true,
});

export const insertServerAdminSchema = createInsertSchema(serverAdmins).omit({
  id: true,
  createdAt: true,
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
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertServerAdmin = z.infer<typeof insertServerAdminSchema>;
export type ServerAdmin = typeof serverAdmins.$inferSelect;
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

export type ServerAdminWithEmail = ServerAdmin & {
  email: string;
  name: string;
};

export type ServerWithAdmins = Server & {
  playerCount: number;
  admins: ServerAdminWithEmail[];
  isOwner: boolean;
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

export const verifyEmailSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const confirmPasswordChangeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const confirmEmailChangeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export const resendVerificationSchema = z.object({});

export const addServerAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const removeServerAdminSchema = z.object({
  adminId: z.number(),
});
