/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me - College Edition - Stripe Payment Integration
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { PRODUCTS } from "../products";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export const stripeRouter = router({
  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        productKey: z.enum(["STUDENT", "SCHOLAR", "ACADEMIC_PASS"]),
        successPath: z.string().default("/dashboard?payment=success"),
        cancelPath: z.string().default("/dashboard?payment=cancelled"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = PRODUCTS[input.productKey];
      
      if (!product) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid product",
        });
      }

      const origin = ctx.req.headers.origin || "http://localhost:3000";

      try {
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: product.priceId, // Use existing Stripe Price ID
              quantity: 1,
            },
          ],
          success_url: `${origin}${input.successPath}`,
          cancel_url: `${origin}${input.cancelPath}`,
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || null,
            customer_name: ctx.user.name || "",
            product_key: input.productKey,
          },
          allow_promotion_codes: true,
        });

        return {
          checkoutUrl: session.url!,
          sessionId: session.id,
        };
      } catch (error) {
        console.error("[Stripe] Checkout session creation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),

  /**
   * Get subscription status for current user
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Query database for user's subscription status
    // For now, return mock data
    return {
      isActive: false,
      plan: null,
      currentPeriodEnd: null,
    };
  }),

  /**
   * Get available products
   */
  getProducts: publicProcedure.query(() => {
    return Object.entries(PRODUCTS).map(([key, product]) => ({
      key,
      name: product.name,
      description: product.features.join(', '),
      price: product.price / 100, // Convert cents to dollars
      priceId: product.priceId,
      currency: product.currency,
      interval: product.interval,
      features: product.features,
    }));
  }),
});
