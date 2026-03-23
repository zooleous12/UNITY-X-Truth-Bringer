/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - Material Processing Service
 * 
 * Handles background processing of uploaded materials:
 * - Audio/Video transcription using Whisper
 * - PDF text extraction
 * - Study guide generation using GPT
 */

import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { transcribeAudio as whisperTranscribe } from "../_core/voiceTranscription";

/**
 * Process a single material by ID
 */
export async function processMaterial(materialId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Get the material
  const [material] = await db
    .select()
    .from(schema.studyMaterials)
    .where(eq(schema.studyMaterials.id, materialId));

  if (!material) {
    throw new Error(`Material ${materialId} not found`);
  }

  if (material.status !== "pending") {
    console.log(`Material ${materialId} already processed (status: ${material.status})`);
    return;
  }

  try {
    // Update status to processing
    await db
      .update(schema.studyMaterials)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(schema.studyMaterials.id, materialId));

    let transcription = "";
    let studyGuide = "";
    let keyPoints: string[] = [];

    // Process based on type
    if (material.type === "audio" || material.type === "video") {
      // Transcribe audio/video using Whisper
      transcription = await transcribeAudio(material.originalFileUrl!);
      
      // Generate study guide from transcription
      const studyContent = await generateStudyGuide(transcription);
      studyGuide = studyContent.guide;
      keyPoints = studyContent.keyPoints;
    } else if (material.type === "pdf") {
      // Extract text from PDF (placeholder - needs PDF parsing library)
      transcription = await extractPDFText(material.originalFileUrl!);
      
      // Generate study guide from extracted text
      const studyContent = await generateStudyGuide(transcription);
      studyGuide = studyContent.guide;
      keyPoints = studyContent.keyPoints;
    }

    // Update material with results
    await db
      .update(schema.studyMaterials)
      .set({
        status: "completed",
        transcription,
        summary: studyGuide, // 'summary' is the correct field name
        keyPoints: keyPoints,
        updatedAt: new Date(),
      })
      .where(eq(schema.studyMaterials.id, materialId));

    console.log(`✅ Material ${materialId} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing material ${materialId}:`, error);
    
    // Update status to failed
    await db
      .update(schema.studyMaterials)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(schema.studyMaterials.id, materialId));
  }
}

/**
 * Transcribe audio/video file using Whisper API
 */
async function transcribeAudio(fileUrl: string): Promise<string> {
  console.log(`Transcribing audio from ${fileUrl}...`);
  
  try {
    const result = await whisperTranscribe({
      audioUrl: fileUrl,
    });
    
    // Check if result is an error
    if ('error' in result) {
      throw new Error(`Transcription failed: ${result.error}`);
    }
    
    return result.text;
  } catch (error) {
    console.error("Whisper transcription failed:", error);
    throw new Error(`Transcription failed: ${error}`);
  }
}

/**
 * Extract text from PDF file
 */
async function extractPDFText(fileUrl: string): Promise<string> {
  // TODO: Implement PDF text extraction
  // Options: pdf-parse, pdfjs-dist, or external API
  console.log(`Extracting text from PDF ${fileUrl}...`);
  
  // Placeholder extraction
  return "This is a placeholder PDF text extraction. Needs implementation with a PDF parsing library.";
}

/**
 * Generate study guide from transcription/text using GPT
 */
async function generateStudyGuide(content: string): Promise<{
  guide: string;
  keyPoints: string[];
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant. Generate a comprehensive study guide from the provided lecture content. Include a summary, key concepts, and important points.",
        },
        {
          role: "user",
          content: `Generate a study guide from this lecture content:\n\n${content}`,
        },
      ],
    });

    const guideContent = response.choices[0]?.message?.content;
    const guide = typeof guideContent === 'string' ? guideContent : "Failed to generate study guide";

    // Extract key points using GPT
    const keyPointsResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Extract 5-10 key points from the lecture content. Return as a JSON array of strings.",
        },
        {
          role: "user",
          content: `Extract key points from:\n\n${content}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "key_points",
          strict: true,
          schema: {
            type: "object",
            properties: {
              points: {
                type: "array",
                items: { type: "string" },
                description: "Array of key points from the lecture",
              },
            },
            required: ["points"],
            additionalProperties: false,
          },
        },
      },
    });

    const keyPointsContent = keyPointsResponse.choices[0]?.message?.content;
    const contentStr = typeof keyPointsContent === 'string' ? keyPointsContent : "{}";
    const parsed = JSON.parse(contentStr);
    const keyPoints = parsed.points || [];

    return { guide, keyPoints };
  } catch (error) {
    console.error("Error generating study guide:", error);
    return {
      guide: "Failed to generate study guide",
      keyPoints: [],
    };
  }
}
