import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDb } from "./db";
import { studyMaterials } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Material Processing Pipeline", () => {
  // Mock user for testing (integer to match schema)
  const testUserId = 999999;
  
  beforeEach(async () => {
    // Clean up test materials
    const db = await getDb();
    if (db) {
      await db.delete(studyMaterials).where(eq(studyMaterials.userId, testUserId));
    }
  });

  it("should create material with pending status on upload", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        title: "Test Audio Lecture",
        type: "audio",
        fileUrl: "https://example.com/test.mp3",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    expect(material.id).toBeDefined();

    const [created] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    expect(created.status).toBe("pending");
    expect(created.type).toBe("audio");
  });

  it("should transition from pending to processing status", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        title: "Test Video Lecture",
        type: "video",
        fileUrl: "https://example.com/test.mp4",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    // Simulate status update to processing
    await db
      .update(studyMaterials)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(studyMaterials.id, material.id));

    const [updated] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    expect(updated.status).toBe("processing");
  });

  it("should store transcription and summary on completion", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        title: "Test PDF Document",
        type: "pdf",
        fileUrl: "https://example.com/test.pdf",
        status: "processing",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    const testTranscription = "This is a test transcription of the lecture content.";
    const testSummary = "Test summary with key concepts.";
    const testKeyPoints = ["Point 1", "Point 2", "Point 3"];

    // Simulate completion
    await db
      .update(studyMaterials)
      .set({
        status: "completed",
        transcription: testTranscription,
        summary: testSummary,
        keyPoints: testKeyPoints,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, material.id));

    const [completed] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    expect(completed.status).toBe("completed");
    expect(completed.transcription).toBe(testTranscription);
    expect(completed.summary).toBe(testSummary);
    expect(completed.keyPoints).toHaveLength(3);
  });

  it("should handle processing failures gracefully", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        title: "Test Failed Upload",
        type: "audio",
        fileUrl: "https://example.com/invalid.mp3",
        status: "processing",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    const errorMessage = "Failed to transcribe audio: File format not supported";

    // Simulate failure
    await db
      .update(studyMaterials)
      .set({
        status: "failed",
        summary: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, material.id));

    const [failed] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    expect(failed.status).toBe("failed");
    expect(failed.summary).toContain("Failed to transcribe");
  });

  it("should support all file types (audio, video, pdf)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const fileTypes = [
      { type: "audio", url: "https://example.com/lecture.mp3" },
      { type: "video", url: "https://example.com/lecture.mp4" },
      { type: "pdf", url: "https://example.com/textbook.pdf" },
    ];

    for (const fileType of fileTypes) {
      const [material] = await db
        .insert(studyMaterials)
        .values({
          userId: testUserId,
          title: `Test ${fileType.type} file`,
          type: fileType.type as "audio" | "video" | "pdf",
          fileUrl: fileType.url,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      const [created] = await db
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.id, material.id));

      expect(created.type).toBe(fileType.type);
      expect(created.status).toBe("pending");
    }
  });

  it("should associate materials with courses", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const testCourseId = 1;

    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        courseId: testCourseId,
        title: "Lecture 5 - Data Structures",
        type: "audio",
        fileUrl: "https://example.com/lecture5.mp3",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    const [created] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    expect(created.courseId).toBe(testCourseId);
  });

  it("should track processing timestamps", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const startTime = new Date();

    const [material] = await db
      .insert(studyMaterials)
      .values({
        userId: testUserId,
        title: "Timed Processing Test",
        type: "audio",
        fileUrl: "https://example.com/timed.mp3",
        status: "pending",
        createdAt: startTime,
        updatedAt: startTime,
      })
      .$returningId();

    // Simulate processing delay (longer to ensure timestamp difference)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const completionTime = new Date();
    await db
      .update(studyMaterials)
      .set({
        status: "completed",
        transcription: "Test transcription",
        updatedAt: completionTime,
      })
      .where(eq(studyMaterials.id, material.id));

    const [completed] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, material.id));

    // Timestamps should be at least 1 second apart
    expect(completed.updatedAt.getTime()).toBeGreaterThanOrEqual(completed.createdAt.getTime() + 1000);
  });
});
