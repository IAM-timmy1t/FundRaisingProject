// Stripe Configuration Test Script
// Run this in the browser console to verify Stripe is properly configured

const testStripeConfiguration = async () => {
  console.log('🔍 Testing Stripe Configuration...\n');
  
  // Check if Stripe publishable key is set
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
    return;
  }
  
  if (!publishableKey.startsWith('pk_test_')) {
    console.warn('⚠️  Publishable key does not appear to be a test key. Make sure you\'re using test keys for development.');
  }
  
  console.log('✅ Stripe publishable key is configured');
  console.log(`   Key prefix: ${publishableKey.substring(0, 12)}...`);
  
  // Try to load Stripe
  try {
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe(publishableKey);
    
    if (stripe) {
      console.log('✅ Stripe loaded successfully');
      
      // Test creating a payment method (won't actually charge)
      const { error } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          token: 'tok_visa' // Test token
        }
      });
      
      if (!error) {
        console.log('✅ Stripe can create payment methods');
      } else {
        console.error('❌ Error creating payment method:', error.message);
      }
    } else {
      console.error('❌ Failed to initialize Stripe');
    }
  } catch (err) {
    console.error('❌ Error loading Stripe:', err);
  }
  
  // Check if edge functions are accessible
  console.log('\n🔍 Testing Edge Functions...\n');
  
  try {
    const { supabase } = await import('./lib/customSupabaseClient');
    
    // Test create-payment-intent function (with invalid data to just check if it's deployed)
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: 100,
        campaign_id: 'test-id',
        campaign_title: 'Test Campaign'
      }
    });
    
    if (error) {
      if (error.message.includes('Campaign not found')) {
        console.log('✅ create-payment-intent function is deployed and responding');
      } else {
        console.error('❌ Error with create-payment-intent function:', error.message);
      }
    } else if (data) {
      console.log('✅ create-payment-intent function is working');
    }
  } catch (err) {
    console.error('❌ Error testing edge functions:', err);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Make sure STRIPE_SECRET_KEY is set in Supabase edge function secrets');
  console.log('2. Set up webhook endpoint and STRIPE_WEBHOOK_SECRET');
  console.log('3. Test with a real donation on a campaign');
  console.log('\nSee docs/STRIPE_SETUP.md for detailed instructions.');
};

// Auto-run the test
testStripeConfiguration();
