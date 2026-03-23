/**
 * Fetch actual Stripe Price IDs from the account
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
});

async function fetchPrices() {
  console.log('Fetching products and prices from Stripe...\n');

  try {
    // Fetch all products
    const products = await stripe.products.list({ limit: 100, active: true });
    
    console.log(`Found ${products.data.length} active products:\n`);

    for (const product of products.data) {
      console.log(`Product: ${product.name}`);
      console.log(`  ID: ${product.id}`);
      
      // Fetch prices for this product
      const prices = await stripe.prices.list({ product: product.id, active: true });
      
      if (prices.data.length > 0) {
        console.log(`  Prices:`);
        for (const price of prices.data) {
          const amount = price.unit_amount / 100;
          console.log(`    - ${price.id}: $${amount} ${price.currency.toUpperCase()} / ${price.recurring?.interval || 'one-time'}`);
        }
      } else {
        console.log(`  No active prices found`);
      }
      console.log('');
    }

    // Try to match products to our expected names
    console.log('\n=== RECOMMENDED CONFIGURATION ===\n');
    
    const student = products.data.find(p => 
      p.name.toLowerCase().includes('student') || 
      p.name.toLowerCase().includes('basic')
    );
    
    const scholar = products.data.find(p => 
      p.name.toLowerCase().includes('scholar') || 
      p.name.toLowerCase().includes('mid')
    );
    
    const academic = products.data.find(p => 
      p.name.toLowerCase().includes('academic') || 
      p.name.toLowerCase().includes('pass')
    );

    if (student) {
      const prices = await stripe.prices.list({ product: student.id, active: true });
      if (prices.data.length > 0) {
        console.log(`STUDENT: {`);
        console.log(`  name: "${student.name}",`);
        console.log(`  priceId: "${prices.data[0].id}",`);
        console.log(`  price: ${prices.data[0].unit_amount},`);
        console.log(`},\n`);
      }
    }

    if (scholar) {
      const prices = await stripe.prices.list({ product: scholar.id, active: true });
      if (prices.data.length > 0) {
        console.log(`SCHOLAR: {`);
        console.log(`  name: "${scholar.name}",`);
        console.log(`  priceId: "${prices.data[0].id}",`);
        console.log(`  price: ${prices.data[0].unit_amount},`);
        console.log(`},\n`);
      }
    }

    if (academic) {
      const prices = await stripe.prices.list({ product: academic.id, active: true });
      if (prices.data.length > 0) {
        console.log(`ACADEMIC_PASS: {`);
        console.log(`  name: "${academic.name}",`);
        console.log(`  priceId: "${prices.data[0].id}",`);
        console.log(`  price: ${prices.data[0].unit_amount},`);
        if (prices.data.length > 1) {
          console.log(`  standardPrice: ${prices.data[1].unit_amount},`);
        }
        console.log(`},`);
      }
    }

  } catch (error) {
    console.error('Error fetching Stripe data:', error.message);
    process.exit(1);
  }
}

fetchPrices();
