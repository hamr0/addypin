import { users, pins, analytics, dailyStats, type User, type InsertUser, type Pin, type InsertPin, type Analytics, type InsertAnalytics, type DailyStats, type InsertDailyStats } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";

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
  getTodaysStats(): Promise<{ pinsCreated: number; linksClicked: number; emailsSent: number; activeCountries: number; totalPins: number; topMapApps: Array<{ name: string; clicks: number }> }>;
  updateDailyStats(date: string, stats: Partial<InsertDailyStats>): Promise<DailyStats>;
  getDailyStatsForPeriod(startDate: string, endDate: string): Promise<DailyStats[]>;
  
  // Note: Authentication now handled by Clerk
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
    linksClicked: number; 
    emailsSent: number; 
    activeCountries: number;
    totalPins: number;
    topMapApps: Array<{ name: string; clicks: number }>;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today + 'T00:00:00Z');
    
    // Get today's pins count
    const [pinsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pins)
      .where(gte(pins.createdAt, startOfDay));

    // Get total pins count
    const [totalPinsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pins);

    // Get today's clicks count
    const [clicksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(analytics)
      .where(and(eq(analytics.eventType, 'click'), gte(analytics.timestamp, startOfDay)));

    // Get today's emails count
    const [emailsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(analytics)
      .where(and(eq(analytics.eventType, 'email_sent'), gte(analytics.timestamp, startOfDay)));

    // Get unique countries count
    const [countriesResult] = await db
      .select({ count: sql<number>`count(distinct country)` })
      .from(analytics)
      .where(and(sql`country is not null`, gte(analytics.timestamp, startOfDay)));

    // Get actual map app clicks from analytics metadata
    const mapAppClicksData = await db
      .select({ 
        appName: sql<string>`metadata->>'appName'`,
        count: sql<number>`count(*)`
      })
      .from(analytics)
      .where(and(
        eq(analytics.eventType, 'map_app_click'),
        gte(analytics.timestamp, startOfDay),
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

    return {
      pinsCreated: Number(pinsResult.count) || 0,
      linksClicked: Number(clicksResult.count) || 0,
      emailsSent: Number(emailsResult.count) || 0,
      activeCountries: Number(countriesResult.count) || 0,
      totalPins: Number(totalPinsResult.count) || 0,
      topMapApps: topMapApps,
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

  // Authentication now handled by Clerk - no custom auth methods needed
}

export const storage = new DatabaseStorage();
