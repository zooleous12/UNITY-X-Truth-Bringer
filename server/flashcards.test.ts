/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Flashcards Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";

describe("Flashcards System", () => {
  let testUserId: number;
  let testMaterialId: number;
  let testFlashcardId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a test user
    const [user] = await db
      .insert(schema.users)
      .values({
        openId: `test-flashcards-${Date.now()}`,
        name: "Flashcards Test User",
        email: "flashcards@test.com",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;

    // Create a test material
    const [material] = await db
      .insert(schema.studyMaterials)
      .values({
        userId: testUserId,
        title: "Test Material for Flashcards",
        type: "audio",
        status: "completed",
        originalFileUrl: "https://example.com/test.mp3",
        originalFileKey: "audio/test.mp3",
        transcription: "This is test content for generating flashcards. It contains important concepts and definitions.",
        summary: "A summary of the test material.",
      })
      .$returningId();

    testMaterialId = material.id;

    // Create a test flashcard that is due now
    const now = new Date();
    const pastDate = new Date(now.getTime() - 1000); // 1 second ago to ensure it's due
    const [flashcard] = await db
      .insert(schema.flashcards)
      .values({
        userId: testUserId,
        studyMaterialId: testMaterialId,
        front: "What is a test?",
        back: "A procedure to verify functionality",
        difficulty: "medium",
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewAt: pastDate,
      })
      .$returningId();

    testFlashcardId = flashcard.id;
  });

  it("should retrieve due flashcards", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const now = new Date();
    const flashcards = await db
      .select()
      .from(schema.flashcards)
      .where(
        and(
          eq(schema.flashcards.userId, testUserId),
          lte(schema.flashcards.nextReviewAt, now)
        )
      );

    expect(flashcards.length).toBeGreaterThan(0);
    expect(flashcards[0].userId).toBe(testUserId);
  });

  it("should list all flashcards for a user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const flashcards = await db
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.userId, testUserId));

    expect(flashcards.length).toBeGreaterThan(0);
    expect(flashcards[0].front).toBeDefined();
    expect(flashcards[0].back).toBeDefined();
  });

  it("should update flashcard after review with SM-2 algorithm", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get original flashcard
    const [original] = await db
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.id, testFlashcardId));

    expect(original).toBeDefined();
    expect(original.repetitions).toBe(0);

    // Simulate a "Good" review (quality = 3)
    const quality = 3;
    let newEaseFactor = original.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    const newRepetitions = original.repetitions + 1;
    const newInterval = newRepetitions === 1 ? 1 : newRepetitions === 2 ? 6 : Math.round(original.interval * newEaseFactor);

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    // Update flashcard
    await db
      .update(schema.flashcards)
      .set({
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount: original.correctCount + 1,
      })
      .where(eq(schema.flashcards.id, testFlashcardId));

    // Verify update
    const [updated] = await db
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.id, testFlashcardId));

    expect(updated.repetitions).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.correctCount).toBe(1);
    expect(updated.lastReviewedAt).toBeDefined();
  });

  it("should filter flashcards by material", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const flashcards = await db
      .select()
      .from(schema.flashcards)
      .where(
        and(
          eq(schema.flashcards.userId, testUserId),
          eq(schema.flashcards.studyMaterialId, testMaterialId)
        )
      );

    expect(flashcards.length).toBeGreaterThan(0);
    expect(flashcards[0].studyMaterialId).toBe(testMaterialId);
  });

  it("should calculate correct SM-2 values for failed review", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a flashcard with some progress
    const [flashcard] = await db
      .insert(schema.flashcards)
      .values({
        userId: testUserId,
        studyMaterialId: testMaterialId,
        front: "Test question for failure",
        back: "Test answer",
        difficulty: "hard",
        easeFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewAt: new Date(),
      })
      .$returningId();

    // Simulate a "Again" review (quality = 0) - should reset progress
    const quality = 0;
    const newRepetitions = 0;
    const newInterval = 1;
    let newEaseFactor = 2.5 + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    await db
      .update(schema.flashcards)
      .set({
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewAt,
        incorrectCount: 1,
      })
      .where(eq(schema.flashcards.id, flashcard.id));

    const [updated] = await db
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.id, flashcard.id));

    expect(updated.repetitions).toBe(0);
    expect(updated.interval).toBe(1);
    expect(updated.incorrectCount).toBe(1);
  });
});
