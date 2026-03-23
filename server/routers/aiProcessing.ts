/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - AI Processing Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";

export const aiProcessingRouter = router({
  /**
   * Transcribe audio file using Whisper
   */
  transcribeAudio: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Get material
      const [material] = await db
        .select()
        .from(schema.studyMaterials)
        .where(eq(schema.studyMaterials.id, input.materialId))
        .limit(1);
      
      if (!material || material.userId !== ctx.user.id) {
        throw new Error("Material not found");
      }
      
      if (!material.originalFileUrl) {
        throw new Error("No audio file URL");
      }
      
      // Update status to processing
      await db
        .update(schema.studyMaterials)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(schema.studyMaterials.id, input.materialId));
      
      try {
        // Transcribe with Whisper
        const result = await transcribeAudio({
          audioUrl: material.originalFileUrl,
          language: material.language || undefined,
        });
        
        // Check for error
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Update with transcription
        const duration = 'duration' in result ? result.duration : undefined;
        await db
          .update(schema.studyMaterials)
          .set({
            transcription: result.text,
            duration: duration ? Math.floor(duration) : null,
            wordCount: result.text.split(/\s+/).length,
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(schema.studyMaterials.id, input.materialId));
        
        return {
          success: true,
          transcription: result.text,
          duration,
        };
      } catch (error: any) {
        // Update with error
        await db
          .update(schema.studyMaterials)
          .set({
            status: "failed",
            processingError: error.message,
            updatedAt: new Date(),
          })
          .where(eq(schema.studyMaterials.id, input.materialId));
        
        throw error;
      }
    }),

  /**
   * Generate study guide from transcription
   */
  generateStudyGuide: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Get material with transcription
      const [material] = await db
        .select()
        .from(schema.studyMaterials)
        .where(eq(schema.studyMaterials.id, input.materialId))
        .limit(1);
      
      if (!material || material.userId !== ctx.user.id) {
        throw new Error("Material not found");
      }
      
      if (!material.transcription) {
        throw new Error("No transcription available. Transcribe first.");
      }
      
      // Generate study guide with GPT
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert study guide creator. Analyze lecture transcriptions and create comprehensive study materials including:
1. Summary (2-3 paragraphs)
2. Key Points (5-10 bullet points)
3. Important Definitions (term: definition format)
4. Study Questions (5-10 questions)

Format your response as JSON with keys: summary, keyPoints (array), definitions (array of {term, definition}), studyQuestions (array)`,
          },
          {
            role: "user",
            content: `Create a study guide from this lecture:\n\n${material.transcription}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "study_guide",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                keyPoints: {
                  type: "array",
                  items: { type: "string" },
                },
                definitions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      term: { type: "string" },
                      definition: { type: "string" },
                    },
                    required: ["term", "definition"],
                    additionalProperties: false,
                  },
                },
                studyQuestions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["summary", "keyPoints", "definitions", "studyQuestions"],
              additionalProperties: false,
            },
          },
        },
      });
      
      const content = response.choices[0].message.content;
      const studyGuide = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      
      // Update material with study guide
      await db
        .update(schema.studyMaterials)
        .set({
          summary: studyGuide.summary,
          keyPoints: studyGuide.keyPoints,
          definitions: studyGuide.definitions,
          updatedAt: new Date(),
        })
        .where(eq(schema.studyMaterials.id, input.materialId));
      
      return {
        success: true,
        studyGuide,
      };
    }),

  /**
   * Get material details with all processed data
   */
  getMaterial: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const [material] = await db
        .select()
        .from(schema.studyMaterials)
        .where(eq(schema.studyMaterials.id, input.materialId))
        .limit(1);
      
      if (!material || material.userId !== ctx.user.id) {
        throw new Error("Material not found");
      }
      
      return material;
    }),
});
