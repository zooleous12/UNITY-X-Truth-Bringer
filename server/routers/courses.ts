/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Courses Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const coursesRouter = router({
  /**
   * Create a new course
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Course name is required"),
        code: z.string().optional(),
        color: z.string().default("#6366f1"),
        semester: z.string().optional(),
        instructor: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [course] = await db
        .insert(schema.courses)
        .values({
          userId: ctx.user.id,
          name: input.name,
          code: input.code,
          color: input.color,
          semester: input.semester,
          instructor: input.instructor,
          description: input.description,
        })
        .$returningId();

      return {
        success: true,
        courseId: course.id,
        message: "Course created successfully",
      };
    }),

  /**
   * List all courses for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { courses: [] };

    const courses = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.userId, ctx.user.id))
      .orderBy(desc(schema.courses.createdAt));

    return { courses };
  }),

  /**
   * Get a single course by ID
   */
  get: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [course] = await db
        .select()
        .from(schema.courses)
        .where(
          and(
            eq(schema.courses.id, input.courseId),
            eq(schema.courses.userId, ctx.user.id)
          )
        );

      if (!course) {
        throw new Error("Course not found");
      }

      return { course };
    }),

  /**
   * Update a course
   */
  update: protectedProcedure
    .input(
      z.object({
        courseId: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        color: z.string().optional(),
        semester: z.string().optional(),
        instructor: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const { courseId, ...updates } = input;

      await db
        .update(schema.courses)
        .set(updates)
        .where(
          and(
            eq(schema.courses.id, courseId),
            eq(schema.courses.userId, ctx.user.id)
          )
        );

      return {
        success: true,
        message: "Course updated successfully",
      };
    }),

  /**
   * Delete a course
   */
  delete: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Note: This doesn't delete associated materials, just unlinks them
      // Set courseId to null for all materials in this course
      await db
        .update(schema.studyMaterials)
        .set({ courseId: null })
        .where(eq(schema.studyMaterials.courseId, input.courseId));

      // Delete the course
      await db
        .delete(schema.courses)
        .where(
          and(
            eq(schema.courses.id, input.courseId),
            eq(schema.courses.userId, ctx.user.id)
          )
        );

      return {
        success: true,
        message: "Course deleted successfully",
      };
    }),

  /**
   * Get materials for a specific course
   */
  getMaterials: protectedProcedure
    .input(z.object({ courseId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { materials: [] };

      const materials = await db
        .select()
        .from(schema.studyMaterials)
        .where(
          and(
            eq(schema.studyMaterials.courseId, input.courseId),
            eq(schema.studyMaterials.userId, ctx.user.id)
          )
        )
        .orderBy(desc(schema.studyMaterials.createdAt))
        .limit(input.limit);

      return { materials };
    }),
});
