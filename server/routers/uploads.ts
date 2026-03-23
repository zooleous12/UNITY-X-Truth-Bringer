/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Uploads Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { storagePut } from "../storage";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { processMaterial } from "../services/materialProcessor";

export const uploadsRouter = router({
  /**
   * Upload audio file
   */
  uploadAudio: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64
        courseId: z.number().optional(),
        title: z.string().optional(),
        contentType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const buffer = Buffer.from(input.fileData, "base64");
      const timestamp = Date.now();
      const sanitized = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `audio/${userId}/${timestamp}-${sanitized}`;
      
      const { key, url } = await storagePut(fileKey, buffer, input.contentType);
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const [material] = await db
        .insert(schema.studyMaterials)
        .values({
          userId,
          courseId: input.courseId,
          title: input.title || input.fileName,
          type: "audio",
          originalFileUrl: url,
          originalFileKey: key,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();
      
      // Trigger background processing (async, don't wait)
      processMaterial(material.id).catch((error) => {
        console.error(`Failed to process material ${material.id}:`, error);
      });
      
      return {
        success: true,
        materialId: material.id,
        url,
        message: "Audio uploaded. Transcription starting...",
      };
    }),

  /**
   * Upload PDF file
   */
  uploadPDF: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(),
        courseId: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const buffer = Buffer.from(input.fileData, "base64");
      const timestamp = Date.now();
      const sanitized = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `pdf/${userId}/${timestamp}-${sanitized}`;
      
      const { key, url } = await storagePut(fileKey, buffer, "application/pdf");
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const [material] = await db
        .insert(schema.studyMaterials)
        .values({
          userId,
          courseId: input.courseId,
          title: input.title || input.fileName,
          type: "pdf",
          originalFileUrl: url,
          originalFileKey: key,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();
      
      // Trigger background processing (async, don't wait)
      processMaterial(material.id).catch((error) => {
        console.error(`Failed to process material ${material.id}:`, error);
      });
      
      return {
        success: true,
        materialId: material.id,
        url,
        message: "PDF uploaded. Analysis starting...",
      };
    }),

  /**
   * Upload video file (extracts audio for transcription)
   */
  uploadVideo: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        courseId: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const timestamp = Date.now();
      const sanitized = input.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `video/${userId}/${timestamp}-${sanitized}`;
      
      // Note: In production, you would:
      // 1. Upload video to S3
      // 2. Extract audio using ffmpeg or similar
      // 3. Pass audio to Whisper transcription
      // For now, we'll create a placeholder
      
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const [material] = await db
        .insert(schema.studyMaterials)
        .values({
          userId,
          courseId: input.courseId,
          title: input.title || input.filename,
          type: "video",
          originalFileUrl: `https://placeholder.com/${fileKey}`,
          originalFileKey: fileKey,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();
      
      // Trigger background processing (async, don't wait)
      processMaterial(material.id).catch((error) => {
        console.error(`Failed to process material ${material.id}:`, error);
      });
      
      return {
        success: true,
        materialId: material.id,
        message: "Video uploaded. Audio extraction and transcription starting...",
      };
    }),

  /**
   * Get user's uploads
   */
  getUploads: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { uploads: [], total: 0 };
      
      const uploads = await db
        .select()
        .from(schema.studyMaterials)
        .where(eq(schema.studyMaterials.userId, ctx.user.id))
        .orderBy(desc(schema.studyMaterials.createdAt))
        .limit(input.limit);
      
      return { uploads, total: uploads.length };
    }),

  /**
   * Get a single material by ID
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
        .where(
          and(
            eq(schema.studyMaterials.id, input.materialId),
            eq(schema.studyMaterials.userId, ctx.user.id)
          )
        );
      
      if (!material) {
        throw new Error("Material not found or access denied");
      }
      
      // Get associated course if exists
      let course = null;
      if (material.courseId) {
        const [courseData] = await db
          .select()
          .from(schema.courses)
          .where(eq(schema.courses.id, material.courseId));
        course = courseData || null;
      }
      
      return { material, course };
    }),

  /**
   * Delete a material (removes from database and associated data)
   */
  deleteMaterial: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      // Verify ownership before deleting
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
        throw new Error("Material not found or access denied");
      }
      
      // Delete associated flashcards
      await db
        .delete(schema.flashcards)
        .where(eq(schema.flashcards.studyMaterialId, input.materialId));
      
      // Delete associated Q&A
      await db
        .delete(schema.materialQuestions)
        .where(eq(schema.materialQuestions.materialId, input.materialId));
      
      // Delete the material itself
      await db
        .delete(schema.studyMaterials)
        .where(eq(schema.studyMaterials.id, input.materialId));
      
      return {
        success: true,
        message: "Material deleted successfully",
      };
    }),
});
