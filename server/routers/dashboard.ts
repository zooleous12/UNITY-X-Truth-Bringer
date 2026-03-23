/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Dashboard Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, count, sql } from "drizzle-orm";

export const dashboardRouter = router({
  /**
   * Get user's dashboard stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        materialsCount: 0,
        flashcardsCount: 0,
        studySessionsCount: 0,
        currentStreak: 0,
      };
    }

    // Count study materials
    const [materialsResult] = await db
      .select({ count: count() })
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.userId, ctx.user.id));

    // Count flashcards
    const [flashcardsResult] = await db
      .select({ count: count() })
      .from(schema.flashcards)
      .where(eq(schema.flashcards.userId, ctx.user.id));

    // Count study sessions (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const [sessionsResult] = await db
      .select({ count: count() })
      .from(schema.studySessions)
      .where(
        sql`${schema.studySessions.userId} = ${ctx.user.id} AND ${schema.studySessions.startedAt} >= ${oneWeekAgo}`
      );

    // Calculate streak (simplified - count consecutive days with sessions)
    // For now, return 0 - we can implement proper streak logic later
    const currentStreak = 0;

    return {
      materialsCount: materialsResult?.count || 0,
      flashcardsCount: flashcardsResult?.count || 0,
      studySessionsCount: sessionsResult?.count || 0,
      currentStreak,
    };
  }),
});
