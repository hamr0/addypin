import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const pins = pgTable("pins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortcode: varchar("shortcode", { length: 6 }).notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userEmail: text("user_email"),
  isActive: boolean("is_active").default(true).notNull(),
  userId: varchar("user_id"), // Clerk user ID (nullable for existing pins)
  createdBy: varchar("created_by"), // Email for display
});

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pinId: varchar("pin_id").references(() => pins.id),
  eventType: text("event_type").notNull(), // 'create', 'click', 'email_sent'
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  country: text("country"),
  browser: text("browser"),
  os: text("os"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional event-specific data
});

export const dailyStats = pgTable("daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  pinsCreated: integer("pins_created").default(0).notNull(),
  linksClicked: integer("links_clicked").default(0).notNull(),
  emailsSent: integer("emails_sent").default(0).notNull(),
  uniqueCountries: integer("unique_countries").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const pinsRelations = relations(pins, ({ many }) => ({
  analytics: many(analytics),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  pin: one(pins, {
    fields: [analytics.pinId],
    references: [pins.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPinSchema = createInsertSchema(pins).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  timestamp: true,
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
  updatedAt: true,
});

// OTP codes table for email-based coordinate editing
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPin = z.infer<typeof insertPinSchema>;
export type Pin = typeof pins.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
