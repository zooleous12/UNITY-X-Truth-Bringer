/**
 * PDF Export Router for Lecture Me
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateStudyGuidePDF, generateQAPDF, generateFlashcardsPDF } from "../pdfExport";
import { getDb } from "../db";
import { studyMaterials, materialQuestions, flashcards, courses } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const pdfExportRouter = router({
  /**
   * Export study guide as PDF
   */
  exportStudyGuide: protectedProcedure
    .input(z.object({ materialId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const [material] = await db.select().from(studyMaterials)
        .where(and(
          eq(studyMaterials.id, input.materialId),
          eq(studyMaterials.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!material) {
        throw new Error("Material not found or unauthorized");
      }
      
      let courseName: string | undefined;
      if (material.courseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, material.courseId)).limit(1);
        courseName = course?.name;
      }
      
      const pdfBuffer = generateStudyGuidePDF({
        title: material.title,
        courseName,
        date: new Date(),
        transcription: material.transcription || "",
        summary: material.summary || "",
        keyPoints: Array.isArray(material.keyPoints) ? material.keyPoints.join('|') : "",
      });
      
      // Convert buffer to base64 for transmission
      const base64 = pdfBuffer.toString('base64');
      
      return {
        filename: `${material.title.replace(/[^a-z0-9]/gi, '_')}_study_guide.pdf`,
        data: base64,
      };
    }),

  /**
   * Export Q&A session as PDF
   */
  exportQA: protectedProcedure
    .input(z.object({ materialId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const [material] = await db.select().from(studyMaterials)
        .where(and(
          eq(studyMaterials.id, input.materialId),
          eq(studyMaterials.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!material) {
        throw new Error("Material not found or unauthorized");
      }
      
      // Get Q&A history
      const questions = await db.select().from(materialQuestions)
        .where(and(
          eq(materialQuestions.materialId, input.materialId),
          eq(materialQuestions.userId, ctx.user.id)
        ))
        .orderBy(materialQuestions.createdAt);
      
      if (questions.length === 0) {
        throw new Error("No questions found for this material");
      }
      
      // Get course name if available
      let courseName: string | undefined;
      if (material.courseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, material.courseId)).limit(1);
        courseName = course?.name;
      }
      
      const pdfBuffer = generateQAPDF({
        title: material.title,
        courseName,
        date: new Date(),
        questions: questions.map(q => ({
          question: q.question,
          answer: q.answer,
          createdAt: q.createdAt,
        })),
      });
      
      const base64 = pdfBuffer.toString('base64');
      
      return {
        filename: `${material.title.replace(/[^a-z0-9]/gi, '_')}_qa.pdf`,
        data: base64,
      };
    }),

  /**
   * Export flashcards as PDF
   */
  exportFlashcards: protectedProcedure
    .input(z.object({ 
      courseId: z.number().optional(),
      materialId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Build query conditions
      const conditions = [eq(flashcards.userId, ctx.user.id)];
      
      if (input.courseId) {
        conditions.push(eq(flashcards.courseId, input.courseId));
      }
      
      if (input.materialId) {
        conditions.push(eq(flashcards.studyMaterialId, input.materialId));
      }
      
      const cards = await db.select().from(flashcards)
        .where(and(...conditions))
        .orderBy(flashcards.createdAt);
      
      if (cards.length === 0) {
        throw new Error("No flashcards found");
      }
      
      // Get course name if available
      let courseName: string | undefined;
      if (input.courseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, input.courseId)).limit(1);
        courseName = course?.name;
      }
      
      const pdfBuffer = generateFlashcardsPDF({
        courseName,
        date: new Date(),
        flashcards: cards.map(card => ({
          front: card.front,
          back: card.back,
        })),
      });
      
      const base64 = pdfBuffer.toString('base64');
      
      const filename = courseName 
        ? `${courseName.replace(/[^a-z0-9]/gi, '_')}_flashcards.pdf`
        : 'flashcards.pdf';
      
      return {
        filename,
        data: base64,
      };
    }),
});
