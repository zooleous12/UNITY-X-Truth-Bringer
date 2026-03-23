/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Founder Tiers API
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { founderTierManager } from "../lib/founderTiers";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, count, isNotNull } from "drizzle-orm";

export const founderTiersRouter = router({
  /**
   * Get founder tier information for current user
   */
  getMyTierInfo: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    return {
      isFounder: user.userTier === 'founder_core',
      isBetaTester: user.userTier === 'beta_tester',
      seatNumber: user.seatNumber,
      badge: user.founderBadge,
      lifetimeFree: user.lifetimeFree,
      betaFreeYearActive: user.betaFreeYearEnd ? new Date() < user.betaFreeYearEnd : false,
      betaFreeYearDaysRemaining: founderTierManager.getBetaFreeYearDaysRemaining(user.betaFreeYearEnd),
      benefits: founderTierManager.getTierBenefits(user.userTier),
    };
  }),

  /**
   * Get beta program progress
   */
  getBetaProgress: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select({ count: count() }).from(users);
    const totalUsers = result[0]?.count || 0;

    const progress = founderTierManager.getBetaProgress(totalUsers);
    const isComplete = founderTierManager.isBetaComplete(totalUsers);

    return {
      ...progress,
      isComplete,
    };
  }),

  /**
   * Get available founder seats
   */
  getAvailableSeats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all taken seats
    const takenSeatsResult = await db
      .select({ seatNumber: users.seatNumber })
      .from(users)
      .where(isNotNull(users.seatNumber));

    const takenSeats = takenSeatsResult.map(r => r.seatNumber!);

    // Calculate available seats
    const founderSeatsAvailable: number[] = [];
    for (let i = 6; i <= 10; i++) {
      if (!takenSeats.includes(i)) {
        founderSeatsAvailable.push(i);
      }
    }

    const betaTesterSeatsAvailable: number[] = [];
    for (let i = 11; i <= 30; i++) {
      if (!takenSeats.includes(i)) {
        betaTesterSeatsAvailable.push(i);
      }
    }

    return {
      founderSeats: {
        available: founderSeatsAvailable,
        total: 5, // Public seats 6-10
        remaining: founderSeatsAvailable.length,
      },
      betaTesterSeats: {
        available: betaTesterSeatsAvailable,
        total: 20, // Seats 11-30
        remaining: betaTesterSeatsAvailable.length,
      },
    };
  }),

  /**
   * Claim a founder seat (admin only for now)
   */
  claimFounderSeat: protectedProcedure
    .input(z.object({
      userId: z.number(),
      seatType: z.enum(['reserved_family', 'public_founder']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Only admins can assign founder seats');
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get taken seats
      const takenSeatsResult = await db
        .select({ seatNumber: users.seatNumber })
        .from(users)
        .where(isNotNull(users.seatNumber));
      const takenSeats = takenSeatsResult.map(r => r.seatNumber!);

      // Get next available seat
      const nextSeat = founderTierManager.getNextFounderSeat(takenSeats);
      if (!nextSeat) {
        throw new Error('No founder seats available');
      }

      // Update user
      const badge = founderTierManager.getFounderBadge(nextSeat, input.seatType);
      
      await db.update(users)
        .set({
          userTier: 'founder_core',
          seatNumber: nextSeat,
          seatType: input.seatType,
          lifetimeFree: true,
          founderBadge: badge,
          subscriptionTier: 'founder',
        })
        .where(eq(users.id, input.userId));

      return {
        success: true,
        seatNumber: nextSeat,
        badge,
      };
    }),

  /**
   * Claim a beta tester seat (admin only for now)
   */
  claimBetaTesterSeat: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Only admins can assign beta tester seats');
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get taken seats
      const takenSeatsResult = await db
        .select({ seatNumber: users.seatNumber })
        .from(users)
        .where(isNotNull(users.seatNumber));
      const takenSeats = takenSeatsResult.map(r => r.seatNumber!);

      // Get next available seat
      const nextSeat = founderTierManager.getNextBetaTesterSeat(takenSeats);
      if (!nextSeat) {
        throw new Error('No beta tester seats available');
      }

      // Update user
      const badge = founderTierManager.getFounderBadge(nextSeat, 'beta_tester');
      
      await db.update(users)
        .set({
          userTier: 'beta_tester',
          seatNumber: nextSeat,
          seatType: 'beta_tester',
          founderBadge: badge,
          subscriptionTier: 'beta',
        })
        .where(eq(users.id, input.userId));

      return {
        success: true,
        seatNumber: nextSeat,
        badge,
      };
    }),

  /**
   * Unlock beta free year for all beta testers (admin only, called when milestone reached)
   */
  unlockBetaFreeYear: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Only admins can unlock beta free year');
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if beta is complete
    const result = await db.select({ count: count() }).from(users);
    const totalUsers = result[0]?.count || 0;

    if (!founderTierManager.isBetaComplete(totalUsers)) {
      throw new Error('Beta milestone not reached yet');
    }

    // Unlock free year for all beta testers
    const { betaFreeYearStart, betaFreeYearEnd } = founderTierManager.unlockBetaFreeYear();

    await db.update(users)
      .set({
        betaFreeYearUnlocked: true,
        betaFreeYearStart,
        betaFreeYearEnd,
      })
      .where(eq(users.userTier, 'beta_tester'));

    return {
      success: true,
      unlockedAt: betaFreeYearStart,
      expiresAt: betaFreeYearEnd,
    };
  }),
});
