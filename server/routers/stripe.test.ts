/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Stripe Integration Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";

describe("Stripe Integration", () => {
  let mockContext: Context;

  beforeAll(() => {
    // Mock authenticated user context
    mockContext = {
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "user",
        createdAt: new Date(),
      },
      req: {
        headers: {
          origin: "http://localhost:3000",
        },
      } as any,
      res: {} as any,
    };
  });

  describe("getProducts", () => {
    it("should return all 3 subscription products", async () => {
      const caller = appRouter.createCaller(mockContext);
      const products = await caller.stripe.getProducts();

      expect(products).toHaveLength(3);
      expect(products.map(p => p.key)).toContain("STUDENT");
      expect(products.map(p => p.key)).toContain("SCHOLAR");
      expect(products.map(p => p.key)).toContain("ACADEMIC_PASS");
    });

    it("should include correct price information", async () => {
      const caller = appRouter.createCaller(mockContext);
      const products = await caller.stripe.getProducts();

      const student = products.find(p => p.key === "STUDENT");
      expect(student?.price).toBe(9); // $9.00
      expect(student?.currency).toBe("usd");
      expect(student?.interval).toBe("month");

      const scholar = products.find(p => p.key === "SCHOLAR");
      expect(scholar?.price).toBe(19); // $19.00

      const academicPass = products.find(p => p.key === "ACADEMIC_PASS");
      expect(academicPass?.price).toBe(39); // $39.00/month
    });
  });

  describe("createCheckoutSession", () => {
    it("should require authentication", async () => {
      const unauthenticatedContext = {
        ...mockContext,
        user: null,
      };

      const caller = appRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.stripe.createCheckoutSession({ productKey: "STUDENT" })
      ).rejects.toThrow();
    });

    it("should accept valid product keys", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Test that the input validation accepts all 3 product keys
      const validKeys = ["STUDENT", "SCHOLAR", "ACADEMIC_PASS"] as const;
      
      for (const key of validKeys) {
        // We expect this to fail with Stripe API error (no real API key in test)
        // but it should pass input validation
        try {
          await caller.stripe.createCheckoutSession({ productKey: key });
        } catch (error: any) {
          // Should fail at Stripe API level, not input validation
          expect(error.message).not.toContain("Invalid enum value");
        }
      }
    });

    it("should reject invalid product keys", async () => {
      const caller = appRouter.createCaller(mockContext);

      await expect(
        caller.stripe.createCheckoutSession({ productKey: "INVALID" as any })
      ).rejects.toThrow();
    });
  });

  describe("getSubscriptionStatus", () => {
    it("should return subscription status for authenticated user", async () => {
      const caller = appRouter.createCaller(mockContext);
      const status = await caller.stripe.getSubscriptionStatus();

      expect(status).toHaveProperty("isActive");
      expect(status).toHaveProperty("plan");
      expect(status).toHaveProperty("currentPeriodEnd");
    });

    it("should require authentication", async () => {
      const unauthenticatedContext = {
        ...mockContext,
        user: null,
      };

      const caller = appRouter.createCaller(unauthenticatedContext);

      await expect(
        caller.stripe.getSubscriptionStatus()
      ).rejects.toThrow();
    });
  });
});
