/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Dashboard Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Dashboard Stats", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a test user
    const [user] = await db
      .insert(schema.users)
      .values({
        openId: `test-dashboard-${Date.now()}`,
        name: "Dashboard Test User",
        email: "dashboard@test.com",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;
  });

  it("should count study materials correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Insert test materials
    await db.insert(schema.studyMaterials).values([
      {
        userId: testUserId,
        title: "Test Audio 1",
        type: "audio",
        status: "completed",
        originalFileUrl: "https://example.com/audio1.mp3",
        originalFileKey: "audio/test1.mp3",
      },
      {
        userId: testUserId,
        title: "Test PDF 1",
        type: "pdf",
        status: "completed",
        originalFileUrl: "https://example.com/doc1.pdf",
        originalFileKey: "pdf/test1.pdf",
      },
    ]);

    // Query materials count
    const materials = await db
      .select()
      .from(schema.studyMaterials)
      .where(eq(schema.studyMaterials.userId, testUserId));

    expect(materials.length).toBeGreaterThanOrEqual(2);
  });

  it("should count flashcards correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Insert test flashcards
    await db.insert(schema.flashcards).values([
      {
        userId: testUserId,
        front: "What is AI?",
        back: "Artificial Intelligence",
        difficulty: "easy",
      },
      {
        userId: testUserId,
        front: "What is ML?",
        back: "Machine Learning",
        difficulty: "medium",
      },
    ]);

    // Query flashcards count
    const flashcards = await db
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.userId, testUserId));

    expect(flashcards.length).toBeGreaterThanOrEqual(2);
  });

  it("should count study sessions correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Insert test study sessions
    await db.insert(schema.studySessions).values([
      {
        userId: testUserId,
        duration: 1800, // 30 minutes
        cardsReviewed: 10,
        correctCount: 8,
        incorrectCount: 2,
        startedAt: new Date(),
      },
      {
        userId: testUserId,
        duration: 2400, // 40 minutes
        cardsReviewed: 15,
        correctCount: 12,
        incorrectCount: 3,
        startedAt: new Date(),
      },
    ]);

    // Query sessions count
    const sessions = await db
      .select()
      .from(schema.studySessions)
      .where(eq(schema.studySessions.userId, testUserId));

    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });
});
