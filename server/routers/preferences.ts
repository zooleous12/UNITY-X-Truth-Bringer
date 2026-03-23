/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Preferences Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const preferencesRouter = router({
  // Get user preferences (creates default if doesn't exist)
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, ctx.user.id))
      .limit(1);

    // Create default preferences if they don't exist
    if (prefs.length === 0) {
      await db.insert(schema.userPreferences).values({
        userId: ctx.user.id,
        experimentalFeatures: JSON.stringify({}),
        submittedSuggestions: JSON.stringify([]),
      });
      
      const newPrefs = await db
        .select()
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, ctx.user.id))
        .limit(1);
      
      return {
        ...newPrefs[0],
        experimentalFeatures: {},
        submittedSuggestions: [],
      };
    }

    // Parse JSON fields
    return {
      ...prefs[0],
      experimentalFeatures: prefs[0].experimentalFeatures 
        ? JSON.parse(prefs[0].experimentalFeatures) 
        : {},
      submittedSuggestions: prefs[0].submittedSuggestions 
        ? JSON.parse(prefs[0].submittedSuggestions) 
        : [],
    };
  }),

  // Update theme preferences
  updateTheme: protectedProcedure
    .input(z.object({
      themeMode: z.enum(["light", "dark", "auto"]).optional(),
      purpleShade: z.string().optional(),
      accentColor: z.string().optional(),
      fontSize: z.enum(["small", "medium", "large"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      await db.update(schema.userPreferences)
        .set(input)
        .where(eq(schema.userPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Update layout preferences
  updateLayout: protectedProcedure
    .input(z.object({
      sidebarPosition: z.enum(["left", "right", "hidden"]).optional(),
      cardLayout: z.enum(["compact", "comfortable", "spacious"]).optional(),
      dashboardLayout: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      await db.update(schema.userPreferences)
        .set(input)
        .where(eq(schema.userPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Toggle experimental feature
  toggleFeature: protectedProcedure
    .input(z.object({
      featureKey: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const prefs = await db
        .select()
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, ctx.user.id))
        .limit(1);

      if (prefs.length === 0) {
        throw new Error("Preferences not found");
      }

      const features = prefs[0].experimentalFeatures 
        ? JSON.parse(prefs[0].experimentalFeatures) 
        : {};
      
      features[input.featureKey] = input.enabled;

      await db.update(schema.userPreferences)
        .set({ experimentalFeatures: JSON.stringify(features) })
        .where(eq(schema.userPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Submit suggestion to Charles
  submitSuggestion: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      screenshotUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      const prefs = await db
        .select()
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, ctx.user.id))
        .limit(1);

      if (prefs.length === 0) {
        throw new Error("Preferences not found");
      }

      const suggestions = prefs[0].submittedSuggestions 
        ? JSON.parse(prefs[0].submittedSuggestions) 
        : [];
      
      suggestions.push({
        timestamp: new Date().toISOString(),
        ...input,
      });

      await db.update(schema.userPreferences)
        .set({ submittedSuggestions: JSON.stringify(suggestions) })
        .where(eq(schema.userPreferences.userId, ctx.user.id));

      // TODO: Send notification to Charles via notifyOwner
      // await notifyOwner({
      //   title: `New Suggestion from ${ctx.user.name}`,
      //   content: `${input.title}\n\n${input.description}`,
      // });

      return { success: true };
    }),
});
