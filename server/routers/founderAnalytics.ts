/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Founder Analytics Router
 */

import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { sql, eq, or } from "drizzle-orm";
import { ENV } from "../_core/env";

const adminOnlyProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const founderAnalyticsRouter = router({
  /**
   * Get all founders and beta testers with their activity
   */
  getAllFounders: adminOnlyProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const founders = await db
      .select()
      .from(schema.users)
      .where(or(eq(schema.users.userTier, "founder_core"), eq(schema.users.userTier, "beta_tester")))
      .orderBy(schema.users.seatNumber);

    return founders.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      userTier: f.userTier,
      seatNumber: f.seatNumber,
      founderBadge: f.founderBadge,
      lifetimeFree: f.lifetimeFree,
      betaFreeYearUnlocked: f.betaFreeYearUnlocked,
      createdAt: f.createdAt,
      lastSignedIn: f.lastSignedIn,
    }));
  }),

  /**
   * Get all founder preferences and experimental features
   */
  getFounderPreferences: adminOnlyProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(sql`
      SELECT 
        up.*,
        u.name as userName,
        u.email as userEmail,
        u.founderBadge
      FROM user_preferences up
      JOIN users u ON up.userId = u.id
      WHERE u.userTier IN ('founder_core', 'beta_tester')
      ORDER BY u.seatNumber
    `);

    return (result as any)[0] || [];
  }),

  /**
   * Get all submitted suggestions from founders
   */
  getAllSuggestions: adminOnlyProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(sql`
      SELECT 
        up.submittedSuggestions,
        u.name as userName,
        u.email as userEmail,
        u.founderBadge,
        u.seatNumber
      FROM user_preferences up
      JOIN users u ON up.userId = u.id
      WHERE u.userTier IN ('founder_core', 'beta_tester')
        AND up.submittedSuggestions IS NOT NULL
        AND up.submittedSuggestions != '[]'
      ORDER BY u.seatNumber
    `);

    const allSuggestions: any[] = [];
    const rows = (result as any)[0] || [];
    
    for (const row of rows) {
      try {
        const suggestions = JSON.parse(row.submittedSuggestions || "[]");
        for (const suggestion of suggestions) {
          allSuggestions.push({
            ...suggestion,
            userName: row.userName,
            userEmail: row.userEmail,
            founderBadge: row.founderBadge,
            seatNumber: row.seatNumber,
          });
        }
      } catch (e) {
        console.error("[Founder Analytics] Failed to parse suggestions:", e);
      }
    }

    // Sort by timestamp descending
    allSuggestions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allSuggestions;
  }),

  /**
   * Get feature adoption statistics
   */
  getFeatureAdoption: adminOnlyProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(sql`
      SELECT experimentalFeatures
      FROM user_preferences up
      JOIN users u ON up.userId = u.id
      WHERE u.userTier IN ('founder_core', 'beta_tester')
    `);

    const featureCounts: Record<string, number> = {};
    let totalFounders = 0;

    const rows = (result as any)[0] || [];
    for (const row of rows) {
      totalFounders++;
      try {
        const features = JSON.parse(row.experimentalFeatures || "{}");
        for (const [key, value] of Object.entries(features)) {
          if (value === true) {
            featureCounts[key] = (featureCounts[key] || 0) + 1;
          }
        }
      } catch (e) {
        console.error("[Founder Analytics] Failed to parse features:", e);
      }
    }

    return {
      totalFounders,
      features: Object.entries(featureCounts).map(([name, count]) => ({
        name,
        count,
        percentage: totalFounders > 0 ? Math.round((count / totalFounders) * 100) : 0,
      })),
    };
  }),
});
