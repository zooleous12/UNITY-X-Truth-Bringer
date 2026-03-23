/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Q&A Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const qaRouter = router({
  /**
   * Ask a question about a material
   */
  askQuestion: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        question: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const startTime = Date.now();
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Get the material and verify ownership
      const [material] = await db
        .select()
        .from(schema.studyMaterials)
        .where(
          and(
            eq(schema.studyMaterials.id, input.materialId),
            eq(schema.studyMaterials.userId, userId)
          )
        );
      
      if (!material) {
        throw new Error("Material not found or you don't have access");
      }
      
      if (material.status !== "completed") {
        throw new Error("Material is still being processed. Please wait until processing is complete.");
      }
      
      if (!material.transcription && !material.summary) {
        throw new Error("No content available to answer questions about");
      }
      
      // Build context from material content
      const context = `
Title: ${material.title}
Type: ${material.type}

${material.summary ? `Summary:\n${material.summary}\n\n` : ""}
${material.transcription ? `Full Content:\n${material.transcription}` : ""}
${material.keyPoints && material.keyPoints.length > 0 ? `\n\nKey Points:\n${material.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}
`.trim();
      
      // Call AI to answer the question
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a helpful study assistant. Answer questions about the following study material accurately and concisely. Base your answers only on the provided content. If the answer isn't in the content, say so.

${context}`,
          },
          {
            role: "user",
            content: input.question,
          },
        ],
      });
      
      const answerContent = response.choices[0]?.message?.content;
      const answer: string = typeof answerContent === 'string' 
        ? answerContent 
        : "I couldn't generate an answer. Please try again.";
      const tokensUsed = response.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;
      
      // Save question and answer to database
      const [savedQuestion] = await db
        .insert(schema.materialQuestions)
        .values({
          materialId: input.materialId,
          userId,
          question: input.question,
          answer,
          tokensUsed,
          responseTime,
        })
        .$returningId();
      
      return {
        id: savedQuestion.id,
        question: input.question,
        answer,
        tokensUsed,
        responseTime,
        createdAt: new Date(),
      };
    }),

  /**
   * Get question history for a material
   */
  getQuestions: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Verify user owns the material
      const [material] = await db
        .select({ id: schema.studyMaterials.id })
        .from(schema.studyMaterials)
        .where(
          and(
            eq(schema.studyMaterials.id, input.materialId),
            eq(schema.studyMaterials.userId, userId)
          )
        );
      
      if (!material) {
        throw new Error("Material not found or you don't have access");
      }
      
      // Get questions for this material
      const questions = await db
        .select()
        .from(schema.materialQuestions)
        .where(
          and(
            eq(schema.materialQuestions.materialId, input.materialId),
            eq(schema.materialQuestions.userId, userId)
          )
        )
        .orderBy(desc(schema.materialQuestions.createdAt))
        .limit(input.limit);
      
      return questions;
    }),

  /**
   * Delete a question
   */
  deleteQuestion: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Verify ownership before deleting
      const [question] = await db
        .select()
        .from(schema.materialQuestions)
        .where(eq(schema.materialQuestions.id, input.questionId));
      
      if (!question || question.userId !== userId) {
        throw new Error("Question not found or you don't have access");
      }
      
      await db
        .delete(schema.materialQuestions)
        .where(eq(schema.materialQuestions.id, input.questionId));
      
      return { success: true };
    }),
});
