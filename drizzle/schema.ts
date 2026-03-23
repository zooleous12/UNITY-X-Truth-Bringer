/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * This file is part of Lecture Me - College Edition™, an AI-powered study platform.
 * Unauthorized copying, distribution, or modification is strictly prohibited.
 * 
 * Author: Charles Kendrick <lectureme.app@gmail.com>
 * Project: Lecture Me - College Edition
 * Location: Phoenix, Arizona, USA
 * 
 * For licensing inquiries: lectureme.app@gmail.com
 */
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

/**
 * Lecture Me Pro Database Schema
 * Comprehensive schema for AI-powered study platform with subscriptions
 */

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Subscription fields
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "student", "scholar", "academic", "founder", "beta"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing"]).default("active"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  
  // Founder & Beta Tester fields
  userTier: mysqlEnum("userTier", ["regular", "founder_core", "beta_tester"]).default("regular").notNull(),
  seatNumber: int("seatNumber"), // 1-10 for founders, 11-30 for beta testers
  seatType: mysqlEnum("seatType", ["reserved_family", "public_founder", "beta_tester"]),
  lifetimeFree: boolean("lifetimeFree").default(false).notNull(),
  betaFreeYearUnlocked: boolean("betaFreeYearUnlocked").default(false).notNull(),
  betaFreeYearStart: timestamp("betaFreeYearStart"),
  betaFreeYearEnd: timestamp("betaFreeYearEnd"),
  founderBadge: varchar("founderBadge", { length: 100 }), // "Core User #6", "Beta Tester #15"
  
  // Usage tracking
  monthlyAudioMinutes: int("monthlyAudioMinutes").default(0).notNull(),
  monthlyPdfPages: int("monthlyPdfPages").default(0).notNull(),
  usageResetAt: timestamp("usageResetAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// COURSES
// ============================================================================

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }), // e.g., "BIO101", "MATH202"
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // hex color for UI
  
  // Course details
  semester: varchar("semester", { length: 50 }), // e.g., "Fall 2026", "Spring 2026"
  instructor: varchar("instructor", { length: 200 }),
  description: text("description"),
  
  // Statistics
  materialsCount: int("materialsCount").default(0).notNull(),
  flashcardsCount: int("flashcardsCount").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ============================================================================
// STUDY MATERIALS
// ============================================================================

export const studyMaterials = mysqlTable("study_materials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId"), // optional - can be null for unorganized materials
  
  title: varchar("title", { length: 500 }).notNull(),
  type: mysqlEnum("type", ["audio", "pdf", "document_scan", "video"]).notNull(),
  
  // File storage
  originalFileUrl: text("originalFileUrl"),
  originalFileKey: text("originalFileKey"),
  processedFileUrl: text("processedFileUrl"),
  processedFileKey: text("processedFileKey"),
  
  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  processingError: text("processingError"),
  
  // Content metadata
  duration: int("duration"), // seconds for audio/video
  pageCount: int("pageCount"), // for PDFs
  wordCount: int("wordCount"),
  language: varchar("language", { length: 10 }),
  
  // Extracted content
  transcription: text("transcription"),
  summary: text("summary"),
  keyPoints: json("keyPoints").$type<string[]>(),
  definitions: json("definitions").$type<Array<{ term: string; definition: string }>>(),
  timestamps: json("timestamps").$type<Array<{ time: number; text: string; isKeyPoint: boolean }>>(),
  
  // Study metadata
  subject: varchar("subject", { length: 100 }),
  course: varchar("course", { length: 200 }),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudyMaterial = typeof studyMaterials.$inferSelect;
export type InsertStudyMaterial = typeof studyMaterials.$inferInsert;

// ============================================================================
// FLASHCARDS
// ============================================================================

export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId"), // optional - can be null
  studyMaterialId: int("studyMaterialId"), // optional - can be standalone
  
  front: text("front").notNull(),
  back: text("back").notNull(),
  
  // Spaced repetition data
  easeFactor: float("easeFactor").default(2.5).notNull(),
  interval: int("interval").default(0).notNull(), // days
  repetitions: int("repetitions").default(0).notNull(),
  nextReviewAt: timestamp("nextReviewAt").defaultNow().notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  
  // Performance tracking
  correctCount: int("correctCount").default(0).notNull(),
  incorrectCount: int("incorrectCount").default(0).notNull(),
  
  // Metadata
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;

// ============================================================================
// WEAKNESS ANALYSIS
// ============================================================================

export const weaknessAnalyses = mysqlTable("weakness_analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Source material
  testImageUrl: text("testImageUrl").notNull(),
  testImageKey: text("testImageKey").notNull(),
  testType: varchar("testType", { length: 100 }), // quiz, homework, exam
  subject: varchar("subject", { length: 100 }),
  
  // Analysis results
  mistakes: json("mistakes").$type<Array<{
    question: string;
    yourAnswer: string;
    correctAnswer: string;
    explanation: string;
    concept: string;
  }>>(),
  
  weakConcepts: json("weakConcepts").$type<Array<{
    concept: string;
    severity: "low" | "medium" | "high";
    occurrences: number;
  }>>(),
  
  predictions: json("predictions").$type<Array<{
    concept: string;
    likelihood: number; // 0-100
    reasoning: string;
    studyRecommendation: string;
  }>>(),
  
  // Overall metrics
  score: float("score"),
  totalQuestions: int("totalQuestions"),
  correctAnswers: int("correctAnswers"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeaknessAnalysis = typeof weaknessAnalyses.$inferSelect;
export type InsertWeaknessAnalysis = typeof weaknessAnalyses.$inferInsert;

// ============================================================================
// STUDY SESSIONS
// ============================================================================

export const studySessions = mysqlTable("study_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  sessionType: mysqlEnum("sessionType", ["review", "flashcards", "reading", "practice"]).notNull(),
  studyMaterialId: int("studyMaterialId"),
  
  // Session data
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  durationMinutes: int("durationMinutes"),
  
  // Performance metrics
  itemsReviewed: int("itemsReviewed").default(0).notNull(),
  itemsCorrect: int("itemsCorrect").default(0).notNull(),
  itemsIncorrect: int("itemsIncorrect").default(0).notNull(),
  
  // Metadata
  subject: varchar("subject", { length: 100 }),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = typeof studySessions.$inferInsert;

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  achievementType: varchar("achievementType", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  
  progress: int("progress").default(0).notNull(),
  target: int("target").notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

// ============================================================================
// SUBSCRIPTION HISTORY
// ============================================================================

export const subscriptionHistory = mysqlTable("subscription_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  action: mysqlEnum("action", ["subscribed", "upgraded", "downgraded", "canceled", "renewed"]).notNull(),
  fromTier: mysqlEnum("fromTier", ["free", "student", "scholar", "academic"]),
  toTier: mysqlEnum("toTier", ["free", "student", "scholar", "academic"]).notNull(),
  
  amount: float("amount"),
  currency: varchar("currency", { length: 3 }).default("usd"),
  
  stripeEventId: varchar("stripeEventId", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = typeof subscriptionHistory.$inferInsert;

// ============================================================================
// USER PREFERENCES (Founder Developer Options)
// ============================================================================

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Theme customization
  themeMode: mysqlEnum("themeMode", ["light", "dark", "auto"]).default("dark"),
  purpleShade: varchar("purpleShade", { length: 20 }).default("default"), // "lighter", "default", "darker"
  accentColor: varchar("accentColor", { length: 7 }).default("#a855f7"), // hex color
  fontSize: mysqlEnum("fontSize", ["small", "medium", "large"]).default("medium"),
  
  // Layout preferences
  sidebarPosition: mysqlEnum("sidebarPosition", ["left", "right", "hidden"]).default("left"),
  cardLayout: mysqlEnum("cardLayout", ["compact", "comfortable", "spacious"]).default("comfortable"),
  dashboardLayout: varchar("dashboardLayout", { length: 50 }).default("default"),
  
  // Feature flags (for founders/beta testers) - stored as JSON string
  experimentalFeatures: text("experimentalFeatures"),
  
  // Feedback submissions - stored as JSON string
  submittedSuggestions: text("submittedSuggestions"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ============================================================================
// MATERIAL QUESTIONS (AI Q&A)
// ============================================================================

export const materialQuestions = mysqlTable("material_questions", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  userId: int("userId").notNull(),
  
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  
  // Metadata
  tokensUsed: int("tokensUsed"), // for tracking API usage
  responseTime: int("responseTime"), // milliseconds
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialQuestion = typeof materialQuestions.$inferSelect;
export type InsertMaterialQuestion = typeof materialQuestions.$inferInsert;
