/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Flashcards Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * SM-2 Algorithm for Spaced Repetition
 * @param quality - User's response quality (0-5): 0=Again, 1=Hard, 3=Good, 5=Easy
 * @param easeFactor - Current ease factor (default 2.5)
 * @param interval - Current interval in days
 * @param repetitions - Number of successful repetitions
 * @returns Updated values for next review
 */
function calculateSM2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
) {
  // Update ease factor
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  // Update repetitions and interval
  let newRepetitions = repetitions;
  let newInterval = interval;

  if (quality < 3) {
    // Failed - reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Passed
    newRepetitions += 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
  };
}

export const flashcardsRouter = router({
  /**
   * Generate flashcards from a study material using GPT
   */
  generate: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        count: z.number().min(5).max(50).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get the material
      const [material] = await db
        .select()
        .from(schema.studyMaterials)
        .where(
          and(
            eq(schema.studyMaterials.id, input.materialId),
            eq(schema.studyMaterials.userId, ctx.user.id)
          )
        );

      if (!material) {
        throw new Error("Material not found");
      }

      if (!material.transcription && !material.summary) {
        throw new Error("Material has no content to generate flashcards from");
      }

      // Use transcription or summary as source
      const content = material.transcription || material.summary || "";

      // Generate flashcards using GPT
      const prompt = `You are an expert educator creating study flashcards. Based on the following content, generate exactly ${input.count} flashcards.

Content:
${content.substring(0, 4000)} ${content.length > 4000 ? "..." : ""}

Instructions:
- Create clear, concise questions on the front
- Provide accurate, complete answers on the back
- Focus on key concepts, definitions, and important facts
- Vary difficulty levels (easy, medium, hard)
- Format as JSON array with this structure:
[
  {
    "front": "Question text",
    "back": "Answer text",
    "difficulty": "easy|medium|hard"
  }
]

Generate ${input.count} flashcards now:`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a helpful study assistant that creates educational flashcards. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "flashcards",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  flashcards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string" },
                        back: { type: "string" },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "medium", "hard"],
                        },
                      },
                      required: ["front", "back", "difficulty"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["flashcards"],
                additionalProperties: false,
              },
            },
          },
        });

        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent) {
          throw new Error("No response from AI");
        }

        const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
        const parsed = JSON.parse(contentString);
        const flashcards = parsed.flashcards || [];

        if (flashcards.length === 0) {
          throw new Error("No flashcards generated");
        }

        // Insert flashcards into database
        const insertedIds = [];
        for (const card of flashcards) {
          const [inserted] = await db
            .insert(schema.flashcards)
            .values({
              userId: ctx.user.id,
              courseId: material.courseId,
              studyMaterialId: material.id,
              front: card.front,
              back: card.back,
              difficulty: card.difficulty,
              easeFactor: 2.5,
              interval: 0,
              repetitions: 0,
              nextReviewAt: new Date(), // Due immediately
            })
            .$returningId();
          insertedIds.push(inserted.id);
        }

        return {
          success: true,
          count: flashcards.length,
          flashcardIds: insertedIds,
          message: `Generated ${flashcards.length} flashcards successfully!`,
        };
      } catch (error) {
        console.error("Flashcard generation error:", error);
        throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Get flashcards for review
   */
  getDueCards: protectedProcedure
    .input(
      z.object({
        courseId: z.number().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { flashcards: [] };

      const now = new Date();
      const conditions = [
        eq(schema.flashcards.userId, ctx.user.id),
        lte(schema.flashcards.nextReviewAt, now),
      ];

      if (input.courseId) {
        conditions.push(eq(schema.flashcards.courseId, input.courseId));
      }

      const flashcards = await db
        .select()
        .from(schema.flashcards)
        .where(and(...conditions))
        .orderBy(schema.flashcards.nextReviewAt)
        .limit(input.limit);

      return { flashcards };
    }),

  /**
   * Get all flashcards for a user
   */
  list: protectedProcedure
    .input(
      z.object({
        courseId: z.number().optional(),
        materialId: z.number().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { flashcards: [] };

      const conditions = [eq(schema.flashcards.userId, ctx.user.id)];

      if (input.courseId) {
        conditions.push(eq(schema.flashcards.courseId, input.courseId));
      }

      if (input.materialId) {
        conditions.push(eq(schema.flashcards.studyMaterialId, input.materialId));
      }

      const flashcards = await db
        .select()
        .from(schema.flashcards)
        .where(and(...conditions))
        .orderBy(desc(schema.flashcards.createdAt))
        .limit(input.limit);

      return { flashcards };
    }),

  /**
   * Review a flashcard and update SM-2 algorithm
   */
  review: protectedProcedure
    .input(
      z.object({
        flashcardId: z.number(),
        quality: z.number().min(0).max(5), // 0=Again, 1=Hard, 3=Good, 5=Easy
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get the flashcard
      const [flashcard] = await db
        .select()
        .from(schema.flashcards)
        .where(
          and(
            eq(schema.flashcards.id, input.flashcardId),
            eq(schema.flashcards.userId, ctx.user.id)
          )
        );

      if (!flashcard) {
        throw new Error("Flashcard not found");
      }

      // Calculate new SM-2 values
      const { easeFactor, interval, repetitions } = calculateSM2(
        input.quality,
        flashcard.easeFactor,
        flashcard.interval,
        flashcard.repetitions
      );

      // Calculate next review date
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + interval);

      // Update performance tracking
      const correctCount = input.quality >= 3 ? flashcard.correctCount + 1 : flashcard.correctCount;
      const incorrectCount = input.quality < 3 ? flashcard.incorrectCount + 1 : flashcard.incorrectCount;

      // Update flashcard
      await db
        .update(schema.flashcards)
        .set({
          easeFactor,
          interval,
          repetitions,
          nextReviewAt,
          lastReviewedAt: new Date(),
          correctCount,
          incorrectCount,
        })
        .where(eq(schema.flashcards.id, input.flashcardId));

      return {
        success: true,
        nextReviewAt,
        interval,
        message: `Next review in ${interval} day${interval !== 1 ? "s" : ""}`,
      };
    }),

  /**
   * Get review statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { dueCount: 0, totalCount: 0, studiedToday: 0 };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count due cards
    const [dueResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.flashcards)
      .where(
        and(
          eq(schema.flashcards.userId, ctx.user.id),
          lte(schema.flashcards.nextReviewAt, now)
        )
      );

    // Count total cards
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.flashcards)
      .where(eq(schema.flashcards.userId, ctx.user.id));

    // Count studied today
    const [studiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.flashcards)
      .where(
        and(
          eq(schema.flashcards.userId, ctx.user.id),
          sql`${schema.flashcards.lastReviewedAt} >= ${todayStart}`
        )
      );

    return {
      dueCount: Number(dueResult?.count || 0),
      totalCount: Number(totalResult?.count || 0),
      studiedToday: Number(studiedResult?.count || 0),
    };
  }),
});
