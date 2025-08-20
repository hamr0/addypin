import { users, pins, analytics, dailyStats, otpCodes, type User, type InsertUser, type Pin, type InsertPin, type Analytics, type InsertAnalytics, type DailyStats, type InsertDailyStats, type OtpCode, type InsertOtpCode } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lt, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Pin methods
  createPin(pin: InsertPin): Promise<Pin>;
  getPinByShortcode(shortcode: string): Promise<Pin | undefined>;
  getPinById(id: string): Promise<Pin | undefined>;
  
  // Analytics methods
  createAnalyticsEvent(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByPin(pinId: string): Promise<Analytics[]>;
  
  // Stats methods
  getTodaysStats(): Promise<{ pinsCreated: number; pinnedCount: number; linksClicked: number; emailsSent: number; activeCountries: number; totalPins: number; topMapApps: Array<{ name: string; clicks: number }>; dailyUsers: number; registeredUsers: number }>;
  updateDailyStats(date: string, stats: Partial<InsertDailyStats>): Promise<DailyStats>;
  getDailyStatsForPeriod(startDate: string, endDate: string): Promise<DailyStats[]>;
  
  // OTP methods for coordinate editing
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string | null): Promise<OtpCode | undefined>;
  markOtpAsUsed(id: string): Promise<void>;
  cleanupExpiredOtpCodes(): Promise<void>;
  invalidateOtpCodesForEmail(email: string): Promise<void>;
  updatePin(shortcode: string, data: Partial<{ latitude: string; longitude: string }>): Promise<Pin>;
  
  // User pin management
  getPinsByEmail(email: string): Promise<Pin[]>;
  deactivatePin(shortcode: string): Promise<void>;
  deletePin(shortcode: string): Promise<boolean>;
  updatePinCoordinates(shortcode: string, latitude: number, longitude: number): Promise<Pin | null>;
  getPinCountByEmail(email: string): Promise<number>;
  
  // Contact form handling removed - using simple console logging
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createPin(insertPin: InsertPin): Promise<Pin> {
    const [pin] = await db
      .insert(pins)
      .values(insertPin)
      .returning();
    return pin;
  }

  async getPinByShortcode(shortcode: string): Promise<Pin | undefined> {
    const [pin] = await db.select().from(pins).where(and(eq(pins.shortcode, shortcode), eq(pins.isActive, true)));
    return pin || undefined;
  }

  async getPinById(id: string): Promise<Pin | undefined> {
    const [pin] = await db.select().from(pins).where(eq(pins.id, id));
    return pin || undefined;
  }

  async createAnalyticsEvent(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const [analyticsEvent] = await db
      .insert(analytics)
      .values(insertAnalytics)
      .returning();
    return analyticsEvent;
  }

  async getAnalyticsByPin(pinId: string): Promise<Analytics[]> {
    return await db.select().from(analytics).where(eq(analytics.pinId, pinId)).orderBy(desc(analytics.timestamp));
  }

  async getTodaysStats(): Promise<{ 
    pinsCreated: number; 
    pinnedCount: number;
    linksClicked: number; 
    emailsSent: number; 
    activeCountries: number;
    totalPins: number;
    topMapApps: Array<{ name: string; clicks: number }>;
    dailyUsers: number;
    registeredUsers: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today + 'T00:00:00Z');
    
    // Get today's pins count
    const [pinsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pins)
      .where(gte(pins.createdAt, startOfDay));

    // Get total pins count (cumulative)
    const [totalPinsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pins);

    // Get pinned count (pins with email addresses - registered pins)
    const [pinnedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pins)
      .where(sql`created_by is not null and created_by != ''`);

    // Get total clicks count (cumulative since AddyPin started - includes both 'click' and 'map_app_click')
    const [clicksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(analytics)
      .where(or(eq(analytics.eventType, 'click'), eq(analytics.eventType, 'map_app_click')));

    // Get total emails count (cumulative)
    const [emailsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(analytics)
      .where(eq(analytics.eventType, 'email_sent'));

    // Get total unique countries count (cumulative)
    const [countriesResult] = await db
      .select({ count: sql<number>`count(distinct country)` })
      .from(analytics)
      .where(sql`country is not null`);

    // Get cumulative map app clicks from analytics metadata
    const mapAppClicksData = await db
      .select({ 
        appName: sql<string>`metadata->>'appName'`,
        count: sql<number>`count(*)`
      })
      .from(analytics)
      .where(and(
        eq(analytics.eventType, 'map_app_click'),
        sql`metadata->>'appName' is not null`
      ))
      .groupBy(sql`metadata->>'appName'`)
      .orderBy(sql`count(*) desc`)
      .limit(3);

    const topMapApps = mapAppClicksData.length > 0 
      ? mapAppClicksData.map(item => ({ name: item.appName, clicks: Number(item.count) }))
      : [
          { name: 'Google Maps', clicks: 0 },
          { name: 'Apple Maps', clicks: 0 },
          { name: 'Waze', clicks: 0 }
        ];

    // Get today's unique sessions (daily users)
    const [dailyUsersResult] = await db
      .select({ count: sql<number>`count(distinct session_id)` })
      .from(analytics)
      .where(and(
        gte(analytics.timestamp, startOfDay),
        sql`session_id is not null`
      ));

    // Get registered users (unique emails with pins)
    const [registeredUsersResult] = await db
      .select({ count: sql<number>`count(distinct user_email)` })
      .from(pins)
      .where(sql`user_email is not null and user_email != ''`);

    return {
      pinsCreated: Number(totalPinsResult.count) || 0,  // Use total pins, not today's pins
      pinnedCount: Number(pinnedResult.count) || 0,     // Registered pins with email
      linksClicked: Number(clicksResult.count) || 0,
      emailsSent: Number(emailsResult.count) || 0,
      activeCountries: Number(countriesResult.count) || 0,
      totalPins: Number(totalPinsResult.count) || 0,
      topMapApps: topMapApps,
      dailyUsers: Number(dailyUsersResult.count) || 0,
      registeredUsers: Number(registeredUsersResult.count) || 0,
    };
  }

  async updateDailyStats(date: string, stats: Partial<InsertDailyStats>): Promise<DailyStats> {
    const [existingStats] = await db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.date, date));

    if (existingStats) {
      const [updated] = await db
        .update(dailyStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(dailyStats.date, date))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyStats)
        .values({ date, ...stats })
        .returning();
      return created;
    }
  }

  async getDailyStatsForPeriod(startDate: string, endDate: string): Promise<DailyStats[]> {
    return await db
      .select()
      .from(dailyStats)
      .where(and(gte(dailyStats.date, startDate), sql`date <= ${endDate}`))
      .orderBy(desc(dailyStats.date));
  }

  // OTP method implementations
  async createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode> {
    const [created] = await db
      .insert(otpCodes)
      .values(otpCode)
      .returning();
    return created;
  }

  async getValidOtpCode(email: string, code: string | null): Promise<OtpCode | undefined> {
    if (code === null) {
      // Return any valid OTP for this email (for checking existing OTPs)
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.email, email),
          eq(otpCodes.used, false),
          gte(otpCodes.expiresAt, new Date())
        ));
      return otpRecord || undefined;
    } else {
      // Return specific OTP for verification
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          gte(otpCodes.expiresAt, new Date())
        ));
      return otpRecord || undefined;
    }
  }

  async markOtpAsUsed(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, id));
  }

  async cleanupExpiredOtpCodes(): Promise<void> {
    await db
      .delete(otpCodes)
      .where(lt(otpCodes.expiresAt, new Date()));
  }

  async invalidateOtpCodesForEmail(email: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(and(
        eq(otpCodes.email, email),
        eq(otpCodes.used, false)
      ));
  }

  async updatePin(shortcode: string, data: Partial<{ latitude: string; longitude: string }>): Promise<Pin> {
    const [updatedPin] = await db
      .update(pins)
      .set(data)
      .where(eq(pins.shortcode, shortcode))
      .returning();
    
    if (!updatedPin) {
      throw new Error("Pin not found");
    }
    
    return updatedPin;
  }

  async getPinsByEmail(email: string): Promise<Pin[]> {
    return await db.select().from(pins)
      .where(and(eq(pins.createdBy, email), eq(pins.isActive, true)))
      .orderBy(pins.createdAt);
  }

  async deactivatePin(shortcode: string): Promise<void> {
    await db
      .update(pins)
      .set({ isActive: false })
      .where(eq(pins.shortcode, shortcode));
  }

  async deletePin(shortcode: string): Promise<boolean> {
    const result = await db
      .update(pins)
      .set({ isActive: false })
      .where(eq(pins.shortcode, shortcode))
      .returning();
    
    return result.length > 0;
  }

  async updatePinCoordinates(shortcode: string, latitude: number, longitude: number): Promise<Pin | null> {
    const [updatedPin] = await db
      .update(pins)
      .set({ 
        latitude: latitude.toString(), 
        longitude: longitude.toString() 
      })
      .where(eq(pins.shortcode, shortcode))
      .returning();
    
    return updatedPin || null;
  }

  async getPinCountByEmail(email: string): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(pins)
      .where(and(eq(pins.createdBy, email), eq(pins.isActive, true)));
    
    return Number(result[0]?.count) || 0;
  }

  // Contact form methods removed - using simple console logging approach
}

export const storage = new DatabaseStorage();
