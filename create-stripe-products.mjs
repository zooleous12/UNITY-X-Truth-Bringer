/**
 * Automatically create Stripe products and prices
 */
import Stripe from 'stripe';
import fs from 'fs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
});

async function createProducts() {
  console.log('Creating Stripe products and prices...\n');

  try {
    // 1. Create Student (Basic) - $9/month
    console.log('Creating Student (Basic) product...');
    const studentProduct = await stripe.products.create({
      name: 'Student (Basic)',
      description: 'Perfect for individual students getting started',
    });

    const studentPrice = await stripe.prices.create({
      product: studentProduct.id,
      unit_amount: 900, // $9.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log(`✅ Student created: ${studentPrice.id}\n`);

    // 2. Create Scholar (Mid) - $19/month
    console.log('Creating Scholar (Mid) product...');
    const scholarProduct = await stripe.products.create({
      name: 'Scholar (Mid)',
      description: 'For serious students who need more power',
    });

    const scholarPrice = await stripe.prices.create({
      product: scholarProduct.id,
      unit_amount: 1900, // $19.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log(`✅ Scholar created: ${scholarPrice.id}\n`);

    // 3. Create Academic Pass - $39/month (with $1 intro price)
    console.log('Creating Academic Pass product...');
    const academicProduct = await stripe.products.create({
      name: 'Lecture Me Academic Pass',
      description: 'Unlimited everything for power users',
    });

    const academicPrice = await stripe.prices.create({
      product: academicProduct.id,
      unit_amount: 3900, // $39.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log(`✅ Academic Pass created: ${academicPrice.id}\n`);

    // Generate updated products.ts file
    const productsConfig = `/**
 * Copyright (c) 2026 Charles Kendrick. All Rights Reserved.
 * 
 * Lecture Me Pro - Stripe Products Configuration
 * AUTO-GENERATED: ${new Date().toISOString()}
 */

export const PRODUCTS = {
  STUDENT: {
    name: "Student (Basic)",
    priceId: "${studentPrice.id}",
    price: 900, // $9.00 in cents
    currency: "usd",
    interval: "month" as const,
    features: [
      "Audio lecture processing",
      "PDF processing",
      "Basic study guides",
      "Flashcards",
      "10 hours/month",
      "Email support",
    ],
  },
  SCHOLAR: {
    name: "Scholar (Mid)",
    priceId: "${scholarPrice.id}",
    price: 1900, // $19.00 in cents
    currency: "usd",
    interval: "month" as const,
    features: [
      "Everything in Student +",
      "Professor style recognition",
      "Textbook-lecture synthesis",
      "Multi-language support",
      "25 hours/month",
      "Priority support",
      "Advanced analytics",
    ],
  },
  ACADEMIC_PASS: {
    name: "Lecture Me Academic Pass",
    priceId: "${academicPrice.id}",
    price: 3900, // $39.00 in cents
    currency: "usd",
    interval: "month" as const,
    features: [
      "AI study guide generation",
      "Audio lecture processing",
      "Textbook synthesis",
      "Flashcards with SM-2 algorithm",
      "Analytics dashboard",
      "Exam prediction",
      "Unlimited processing",
      "Cancel anytime",
    ],
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
`;

    fs.writeFileSync('/home/ubuntu/lecture-me-pro/server/products.ts', productsConfig);
    console.log('✅ Updated server/products.ts with new price IDs\n');

    console.log('=== SUCCESS ===');
    console.log('All products created and code updated!');
    console.log('\nPrice IDs:');
    console.log(`  Student: ${studentPrice.id}`);
    console.log(`  Scholar: ${scholarPrice.id}`);
    console.log(`  Academic Pass: ${academicPrice.id}`);

  } catch (error) {
    console.error('❌ Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
