// Stripe Integration Test Script
// Run this script to verify your Stripe setup is working correctly

import { supabase } from '../src/lib/customSupabaseClient.js';

const testStripeIntegration = async () => {
  console.log('🧪 Testing Stripe Integration...\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables:');
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (publishableKey && publishableKey.startsWith('pk_test_')) {
    console.log('✅ Stripe publishable key is configured');
  } else {
    console.log('❌ Stripe publishable key is missing or invalid');
    console.log('   Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file');
  }

  // Test 2: Test payment intent creation
  console.log('\n2️⃣ Testing payment intent creation:');
  try {
    // This is a mock campaign ID - replace with a real one from your database
    const testCampaignId = '00000000-0000-0000-0000-000000000000';
    const testAmount = 10.00; // $10.00
    
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        campaignId: testCampaignId,
        amount: testAmount,
        currency: 'USD',
        donorEmail: 'test@example.com',
        donorName: 'Test Donor',
        message: 'Test donation',
        isAnonymous: false
      }
    });

    if (error) {
      console.log('❌ Payment intent creation failed:', error.message);
      console.log('   Make sure your edge function is deployed and STRIPE_SECRET_KEY is set');
    } else if (data && data.success) {
      console.log('✅ Payment intent created successfully');
      console.log('   Client secret:', data.data.clientSecret.substring(0, 20) + '...');
    } else {
      console.log('❌ Payment intent creation returned an error:', data?.error);
    }
  } catch (err) {
    console.log('❌ Failed to connect to edge function:', err.message);
    console.log('   Make sure your Supabase edge functions are deployed');
  }

  // Test 3: Check webhook endpoint
  console.log('\n3️⃣ Webhook endpoint info:');
  console.log('   Development: Use Stripe CLI with:');
  console.log('   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook');
  console.log('\n   Production webhook URL:');
  console.log(`   ${supabase.supabaseUrl}/functions/v1/stripe-webhook`);

  console.log('\n✨ Test complete!');
  console.log('\nNext steps:');
  console.log('1. Configure your Stripe API keys in .env.local');
  console.log('2. Deploy edge functions: supabase functions deploy create-payment-intent');
  console.log('3. Set up webhook forwarding with Stripe CLI');
  console.log('4. Test a donation on a campaign page');
};

// Run the test
testStripeIntegration().catch(console.error);
