/**
 * Spaced Repetition Router
 * Handles flashcard reviews using SM-2 algorithm
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { calculateSM2, QUALITY_RATINGS, getCardMaturity } from "../spacedRepetition";

export const spacedRepetitionRouter = router({
  /**
   * Get cards due for review
   */
  getDueCards: protectedProcedure
    .input(
      z.object({
        courseId: z.number().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const now = new Date();

      // Build where conditions
      const conditions = [
        eq(schema.flashcards.userId, userId),
        lte(schema.flashcards.nextReviewAt, now),
      ];

      if (input.courseId) {
        conditions.push(eq(schema.flashcards.courseId, input.courseId));
      }

      const dueCards = await db
        .select()
        .from(schema.flashcards)
        .where(and(...conditions))
        .orderBy(schema.flashcards.nextReviewAt)
        .limit(input.limit);

      return dueCards;
    }),

  /**
   * Review a flashcard and update SM-2 parameters
   */
  reviewCard: protectedProcedure
    .input(
      z.object({
        cardId: z.number(),
        quality: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get the card and verify ownership
      const [card] = await db
        .select()
        .from(schema.flashcards)
        .where(
          and(
            eq(schema.flashcards.id, input.cardId),
            eq(schema.flashcards.userId, userId)
          )
        );

      if (!card) {
        throw new Error("Card not found or you don't have access");
      }

      // Convert quality button to SM-2 rating
      const qualityRating = QUALITY_RATINGS[input.quality];

      // Calculate new SM-2 parameters
      const sm2Result = calculateSM2(
        qualityRating,
        card.easeFactor,
        card.interval,
        card.repetitions
      );

      // Update correct/incorrect counts
      const isCorrect = qualityRating >= 3;
      const correctCount = isCorrect ? card.correctCount + 1 : card.correctCount;
      const incorrectCount = !isCorrect ? card.incorrectCount + 1 : card.incorrectCount;

      // Update the card
      await db
        .update(schema.flashcards)
        .set({
          easeFactor: sm2Result.easeFactor,
          interval: sm2Result.interval,
          repetitions: sm2Result.repetitions,
          nextReviewAt: sm2Result.nextReviewDate,
          lastReviewedAt: new Date(),
          correctCount,
          incorrectCount,
          updatedAt: new Date(),
        })
        .where(eq(schema.flashcards.id, input.cardId));

      return {
        success: true,
        nextReviewDate: sm2Result.nextReviewDate,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        easeFactor: sm2Result.easeFactor,
      };
    }),

  /**
   * Get review statistics
   */
  getReviewStats: protectedProcedure
    .input(
      z.object({
        courseId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const now = new Date();

      // Build where conditions
      const conditions = [eq(schema.flashcards.userId, userId)];
      if (input.courseId) {
        conditions.push(eq(schema.flashcards.courseId, input.courseId));
      }

      // Get all cards for this user/course
      const allCards = await db
        .select()
        .from(schema.flashcards)
        .where(and(...conditions));

      // Calculate statistics
      const totalCards = allCards.length;
      const newCards = allCards.filter((c) => c.repetitions === 0).length;
      const learningCards = allCards.filter(
        (c) => c.repetitions > 0 && c.repetitions < 3
      ).length;
      const matureCards = allCards.filter((c) => c.repetitions >= 3).length;
      const dueToday = allCards.filter((c) => new Date(c.nextReviewAt) <= now).length;

      const totalEaseFactor = allCards.reduce((sum, c) => sum + c.easeFactor, 0);
      const averageEaseFactor =
        totalCards > 0 ? Math.round((totalEaseFactor / totalCards) * 100) / 100 : 2.5;

      const totalReviews = allCards.reduce(
        (sum, c) => sum + c.correctCount + c.incorrectCount,
        0
      );
      const totalCorrect = allCards.reduce((sum, c) => sum + c.correctCount, 0);
      const retentionRate =
        totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

      return {
        totalCards,
        newCards,
        learningCards,
        matureCards,
        dueToday,
        averageEaseFactor,
        retentionRate,
      };
    }),

  /**
   * Get review streak (consecutive days with reviews)
   */
  getReviewStreak: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get all cards with last review dates
    const cards = await db
      .select({
        lastReviewedAt: schema.flashcards.lastReviewedAt,
      })
      .from(schema.flashcards)
      .where(
        and(
          eq(schema.flashcards.userId, userId),
          sql`${schema.flashcards.lastReviewedAt} IS NOT NULL`
        )
      )
      .orderBy(desc(schema.flashcards.lastReviewedAt));

    if (cards.length === 0) {
      return { streak: 0, lastReviewDate: null };
    }

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDates = new Set<string>();
    cards.forEach((card) => {
      if (card.lastReviewedAt) {
        const date = new Date(card.lastReviewedAt);
        date.setHours(0, 0, 0, 0);
        uniqueDates.add(date.toISOString());
      }
    });

    const sortedDates = Array.from(uniqueDates)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentDate = new Date(today);
    for (const reviewDate of sortedDates) {
      const diffDays = Math.floor(
        (currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = new Date(reviewDate);
      } else {
        break;
      }
    }

    return {
      streak,
      lastReviewDate: sortedDates[0] || null,
    };
  }),
});
