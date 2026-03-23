/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Courses Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Courses Router", () => {
  let testUserId: number;
  let testCourseId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a test user
    const [user] = await db
      .insert(schema.users)
      .values({
        openId: `test-courses-${Date.now()}`,
        name: "Courses Test User",
        email: "courses@test.com",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;
  });

  it("should create a new course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const [course] = await db
      .insert(schema.courses)
      .values({
        userId: testUserId,
        name: "Introduction to Biology",
        code: "BIO101",
        color: "#22c55e",
        semester: "Fall 2026",
        instructor: "Dr. Smith",
        description: "An introduction to biological sciences",
      })
      .$returningId();

    testCourseId = course.id;

    expect(course.id).toBeDefined();
    expect(typeof course.id).toBe("number");
  });

  it("should retrieve user's courses", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const courses = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.userId, testUserId));

    expect(courses.length).toBeGreaterThanOrEqual(1);
    
    const createdCourse = courses.find(c => c.id === testCourseId);
    expect(createdCourse).toBeDefined();
    expect(createdCourse?.name).toBe("Introduction to Biology");
    expect(createdCourse?.code).toBe("BIO101");
  });

  it("should update a course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .update(schema.courses)
      .set({
        name: "Advanced Biology",
        instructor: "Dr. Johnson",
      })
      .where(
        and(
          eq(schema.courses.id, testCourseId),
          eq(schema.courses.userId, testUserId)
        )
      );

    const [updatedCourse] = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, testCourseId));

    expect(updatedCourse.name).toBe("Advanced Biology");
    expect(updatedCourse.instructor).toBe("Dr. Johnson");
  });

  it("should link study materials to a course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a study material linked to the course
    const [material] = await db
      .insert(schema.studyMaterials)
      .values({
        userId: testUserId,
        courseId: testCourseId,
        title: "Lecture 1 - Cell Structure",
        type: "audio",
        status: "completed",
        originalFileUrl: "https://example.com/lecture1.mp3",
        originalFileKey: "audio/lecture1.mp3",
      })
      .$returningId();

    expect(material.id).toBeDefined();

    // Verify the material is linked to the course
    const [linkedMaterial] = await db
      .select()
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.id, material.id));

    expect(linkedMaterial.courseId).toBe(testCourseId);
  });

  it("should retrieve materials for a specific course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const materials = await db
      .select()
      .from(schema.studyMaterials)
      .where(
        and(
          eq(schema.studyMaterials.courseId, testCourseId),
          eq(schema.studyMaterials.userId, testUserId)
        )
      );

    expect(materials.length).toBeGreaterThanOrEqual(1);
    materials.forEach((material) => {
      expect(material.courseId).toBe(testCourseId);
      expect(material.userId).toBe(testUserId);
    });
  });

  it("should delete a course and unlink materials", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Unlink materials from the course
    await db
      .update(schema.studyMaterials)
      .set({ courseId: null })
      .where(eq(schema.studyMaterials.courseId, testCourseId));

    // Delete the course
    await db
      .delete(schema.courses)
      .where(
        and(
          eq(schema.courses.id, testCourseId),
          eq(schema.courses.userId, testUserId)
        )
      );

    // Verify course is deleted
    const [deletedCourse] = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, testCourseId));

    expect(deletedCourse).toBeUndefined();

    // Verify materials are unlinked but not deleted
    const materials = await db
      .select()
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.userId, testUserId));

    materials.forEach((material) => {
      expect(material.courseId).toBeNull();
    });
  });
});
