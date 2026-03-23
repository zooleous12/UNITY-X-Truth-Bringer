/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * Lecture Me - College Edition - Founder Auto-Assignment
 */

import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { sql, count } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Auto-assign founder or beta tester tier to new users
 * - Users 1-10: Founder (lifetime free)
 * - Users 11-30: Beta Tester (1 year free after 1000 users)
 */
export async function autoAssignFounderTier(userId: number, userEmail: string, userName: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get total user count
    const [result] = await db.select({ count: count() }).from(schema.users);
    const totalUsers = result.count;

    // Check if user already has a tier assigned
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(sql`${schema.users.id} = ${userId}`)
      .limit(1);

    if (!existingUser || existingUser.userTier !== "regular") {
      // User already has a tier, don't override
      return;
    }

    let tierAssigned = false;
    let welcomeMessage = "";

    // Assign Founder tier (users 1-10)
    if (totalUsers <= 10) {
      await db
        .update(schema.users)
        .set({
          userTier: "founder_core",
          seatNumber: totalUsers,
          lifetimeFree: true,
          founderBadge: `Founder #${totalUsers}`,
        })
        .where(sql`${schema.users.id} = ${userId}`);

      tierAssigned = true;
      welcomeMessage = `🎉 NEW FOUNDER: ${userName || userEmail} is Founder #${totalUsers}!`;
      
      console.log(`[Founder Assignment] Assigned Founder #${totalUsers} to user ${userId}`);
    }
    // Assign Beta Tester tier (users 11-30)
    else if (totalUsers <= 30) {
      const betaSeatNumber = totalUsers - 10; // Beta seats 1-20
      await db
        .update(schema.users)
        .set({
          userTier: "beta_tester",
          seatNumber: betaSeatNumber,
          lifetimeFree: false,
          founderBadge: `Beta Tester #${betaSeatNumber}`,
          betaFreeYearStart: new Date(),
          betaFreeYearUnlocked: true,
        })
        .where(sql`${schema.users.id} = ${userId}`);

      tierAssigned = true;
      welcomeMessage = `🧪 NEW BETA TESTER: ${userName || userEmail} is Beta Tester #${betaSeatNumber}!`;
      
      console.log(`[Founder Assignment] Assigned Beta Tester #${betaSeatNumber} to user ${userId}`);
    }

    // Send notification to Charles
    if (tierAssigned) {
      await notifyOwner({
        title: "New Founder/Beta Tester",
        content: welcomeMessage,
      });
    }
  } catch (error) {
    console.error("[Founder Assignment] Failed to auto-assign tier:", error);
  }
}
