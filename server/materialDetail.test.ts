/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Material Detail Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Material Detail", () => {
  let testUserId: number;
  let testCourseId: number;
  let testMaterialId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a test user
    const [user] = await db
      .insert(schema.users)
      .values({
        openId: `test-material-detail-${Date.now()}`,
        name: "Material Detail Test User",
        email: "materialdetail@test.com",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;

    // Create a test course
    const [course] = await db
      .insert(schema.courses)
      .values({
        userId: testUserId,
        name: "Test Course",
        code: "TEST101",
        color: "#3b82f6",
      })
      .$returningId();

    testCourseId = course.id;

    // Create a test material
    const [material] = await db
      .insert(schema.studyMaterials)
      .values({
        userId: testUserId,
        courseId: testCourseId,
        title: "Test Lecture - Introduction",
        type: "audio",
        status: "completed",
        originalFileUrl: "https://example.com/test.mp3",
        originalFileKey: "audio/test.mp3",
        transcription: "This is a test transcription of the lecture content.",
        summary: "This lecture covers the basics of the subject matter.",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
      })
      .$returningId();

    testMaterialId = material.id;
  });

  it("should retrieve material with course information", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get material
    const [material] = await db
      .select()
      .from(schema.studyMaterials)
      .where(
        and(
          eq(schema.studyMaterials.id, testMaterialId),
          eq(schema.studyMaterials.userId, testUserId)
        )
      );

    expect(material).toBeDefined();
    expect(material.id).toBe(testMaterialId);
    expect(material.title).toBe("Test Lecture - Introduction");
    expect(material.transcription).toBe("This is a test transcription of the lecture content.");
    expect(material.summary).toBe("This lecture covers the basics of the subject matter.");

    // Get associated course
    if (material.courseId) {
      const [course] = await db
        .select()
        .from(schema.courses)
        .where(eq(schema.courses.id, material.courseId));

      expect(course).toBeDefined();
      expect(course.id).toBe(testCourseId);
      expect(course.name).toBe("Test Course");
      expect(course.code).toBe("TEST101");
    }
  });

  it("should handle material without course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create material without course
    const [material] = await db
      .insert(schema.studyMaterials)
      .values({
        userId: testUserId,
        courseId: null,
        title: "Unassigned Material",
        type: "pdf",
        status: "completed",
        originalFileUrl: "https://example.com/test.pdf",
        originalFileKey: "pdf/test.pdf",
        transcription: "Test content",
      })
      .$returningId();

    const [retrievedMaterial] = await db
      .select()
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.id, material.id));

    expect(retrievedMaterial.courseId).toBeNull();
  });

  it("should not retrieve material from different user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create another user
    const [otherUser] = await db
      .insert(schema.users)
      .values({
        openId: `test-other-user-${Date.now()}`,
        name: "Other User",
        email: "other@test.com",
        role: "user",
      })
      .$returningId();

    // Try to get material with wrong user ID
    const [material] = await db
      .select()
      .from(schema.studyMaterials)
      .where(
        and(
          eq(schema.studyMaterials.id, testMaterialId),
          eq(schema.studyMaterials.userId, otherUser.id)
        )
      );

    expect(material).toBeUndefined();
  });

  it("should retrieve material with all content fields", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const [material] = await db
      .select()
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.id, testMaterialId));

    // Verify all content fields are present
    expect(material.transcription).toBeDefined();
    expect(material.summary).toBeDefined();
    expect(material.keyPoints).toBeDefined();
    expect(Array.isArray(material.keyPoints)).toBe(true);
    expect(material.keyPoints?.length).toBeGreaterThan(0);
  });
});
