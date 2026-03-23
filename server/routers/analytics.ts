/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Analytics API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { studySessions, flashcards, achievements } from "../../drizzle/schema";
import { eq, and, gte, count, sum, sql } from "drizzle-orm";
import { achievementManager, ACHIEVEMENT_DEFINITIONS } from "../lib/achievements";

export const analyticsRouter = router({
  /**
   * Get user's overall statistics
   */
  getOverallStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    // Get study sessions stats
    const sessionsResult = await db
      .select({
        totalSessions: count(),
        totalMinutes: sum(studySessions.durationMinutes),
        totalItemsReviewed: sum(studySessions.itemsReviewed),
        totalCorrect: sum(studySessions.itemsCorrect),
      })
      .from(studySessions)
      .where(eq(studySessions.userId, userId));

    const sessions = sessionsResult[0] || {
      totalSessions: 0,
      totalMinutes: 0,
      totalItemsReviewed: 0,
      totalCorrect: 0,
    };

    // Get flashcard stats
    const flashcardsResult = await db
      .select({
        totalCards: count(),
        totalCorrect: sum(flashcards.correctCount),
        totalIncorrect: sum(flashcards.incorrectCount),
      })
      .from(flashcards)
      .where(eq(flashcards.userId, userId));

    const cards = flashcardsResult[0] || {
      totalCards: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
    };

    // Calculate accuracy
    const totalAnswers = (Number(cards.totalCorrect) || 0) + (Number(cards.totalIncorrect) || 0);
    const accuracy = totalAnswers > 0 
      ? Math.round(((Number(cards.totalCorrect) || 0) / totalAnswers) * 100)
      : 0;

    // Get achievements
    const unlockedAchievements = await db
      .select()
      .from(achievements)
      .where(and(
        eq(achievements.userId, userId),
        eq(achievements.completed, true)
      ));

    return {
      totalSessions: Number(sessions.totalSessions) || 0,
      totalMinutes: Number(sessions.totalMinutes) || 0,
      totalHours: Math.round((Number(sessions.totalMinutes) || 0) / 60),
      totalItemsReviewed: Number(sessions.totalItemsReviewed) || 0,
      totalCorrect: Number(sessions.totalCorrect) || 0,
      totalCards: Number(cards.totalCards) || 0,
      accuracy,
      achievementsUnlocked: unlockedAchievements.length,
      totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
    };
  }),

  /**
   * Get weekly study time breakdown
   */
  getWeeklyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekSessions = await db
      .select()
      .from(studySessions)
      .where(and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, sevenDaysAgo)
      ));

    // Group by day
    const dailyStats = new Map<string, { minutes: number; sessions: number }>();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.set(dateKey, { minutes: 0, sessions: 0 });
    }

    for (const session of weekSessions) {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      const current = dailyStats.get(dateKey) || { minutes: 0, sessions: 0 };
      dailyStats.set(dateKey, {
        minutes: current.minutes + (session.durationMinutes || 0),
        sessions: current.sessions + 1,
      });
    }

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        minutes: stats.minutes,
        sessions: stats.sessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }),

  /**
   * Get user's achievements with progress
   */
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    // Get user stats for progress calculation
    const stats = await db
      .select({
        totalSessions: count(),
        totalMinutes: sum(studySessions.durationMinutes),
        totalItemsReviewed: sum(studySessions.itemsReviewed),
      })
      .from(studySessions)
      .where(eq(studySessions.userId, userId));

    const userStats = stats[0] || {
      totalSessions: 0,
      totalMinutes: 0,
      totalItemsReviewed: 0,
    };

    // Get unlocked achievements
    const unlockedAchievements = await db
      .select()
      .from(achievements)
      .where(and(
        eq(achievements.userId, userId),
        eq(achievements.completed, true)
      ));

    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementType));

    // Calculate progress for all achievements
    const achievementsWithProgress = achievementManager.getAllWithProgress({
      cardsStudied: Number(userStats.totalItemsReviewed) || 0,
      streakDays: 0, // TODO: Calculate streak
      totalSessions: Number(userStats.totalSessions) || 0,
      totalHours: Math.round((Number(userStats.totalMinutes) || 0) / 60),
      subjectsCount: 0, // TODO: Count unique subjects
      bestAccuracy: 0, // TODO: Calculate best accuracy
      fastestSession: 999, // TODO: Get fastest session
    });

    return achievementsWithProgress.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlockedAt: unlockedAchievements.find(a => a.achievementType === achievement.id)?.completedAt,
    }));
  }),

  /**
   * Get study streak information
   */
  getStreak: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    // Get all study sessions ordered by date
    const sessions = await db
      .select({
        date: sql<string>`DATE(${studySessions.startedAt})`,
      })
      .from(studySessions)
      .where(eq(studySessions.userId, userId))
      .groupBy(sql`DATE(${studySessions.startedAt})`)
      .orderBy(sql`DATE(${studySessions.startedAt}) DESC`);

    if (sessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      };
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].date);
      sessionDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sessions.length; i++) {
      const currentDate = new Date(sessions[i].date);
      const previousDate = new Date(sessions[i - 1].date);
      
      const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastStudyDate: sessions[0].date,
    };
  }),
});
