// Test Moderation System
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test campaigns with different content types
const testCampaigns = [
  {
    // Good campaign - should pass
    id: 'test-1',
    title: 'Help Build a Community Well',
    story: 'Our village needs clean water. We want to build a well that will serve 500 families. We have received quotes from local contractors and will provide full documentation of expenses. By God\'s grace, this will transform our community.',
    need_type: 'community',
    goal_amount: 5000,
    budget_breakdown: [
      { item: 'Well drilling', amount: 3000, description: 'Professional drilling to 100ft' },
      { item: 'Pump system', amount: 1500, description: 'Solar-powered pump' },
      { item: 'Concrete platform', amount: 500, description: 'Safety platform around well' }
    ]
  },
  {
    // Luxury items - should fail
    id: 'test-2',
    title: 'Need a New Mercedes for Ministry',
    story: 'I need a brand new Mercedes Benz for my ministry work. The luxury car will help me reach more people.',
    need_type: 'other',
    goal_amount: 80000,
    budget_breakdown: [
      { item: 'Mercedes S-Class', amount: 75000 },
      { item: 'Insurance', amount: 5000 }
    ]
  },
  {
    // Suspicious/fraud - should fail
    id: 'test-3',
    title: 'URGENT - Quick Money Needed ASAP',
    story: 'Send money fast! Guaranteed returns! Wire transfer only. Double your money in 30 days!',
    need_type: 'emergency',
    goal_amount: 100000,
    budget_breakdown: []
  },
  {
    // Medical legitimate - should pass
    id: 'test-4',
    title: 'Cancer Treatment for My Mother',
    story: 'My mother was diagnosed with breast cancer. The oncologist at St. Mary\'s Hospital has recommended chemotherapy. We have medical reports and hospital bills. Treatment will take 6 months. We trust God for healing and appreciate your prayers and support.',
    need_type: 'medical',
    goal_amount: 15000,
    budget_breakdown: [
      { item: 'Chemotherapy sessions', amount: 10000, description: '12 sessions at hospital' },
      { item: 'Medications', amount: 3000, description: 'Prescribed drugs' },
      { item: 'Hospital stays', amount: 2000, description: 'Post-treatment care' }
    ]
  },
  {
    // Education legitimate - should pass
    id: 'test-5', 
    title: 'University Tuition Support',
    story: 'I have been accepted to study Computer Science at the University of Nairobi. I come from a poor family but have excellent grades. I need help with tuition fees for the first semester. I will provide my admission letter and fee structure.',
    need_type: 'education',
    goal_amount: 3000,
    budget_breakdown: [
      { item: 'Tuition fees', amount: 2000, description: 'First semester fees' },
      { item: 'Books and supplies', amount: 500, description: 'Required textbooks' },
      { item: 'Accommodation', amount: 500, description: 'Dormitory fees' }
    ]
  }
];

// Import moderation rules from service
async function testModerationRules() {
  console.log('🧪 Testing Moderation Rules...\n');

  const { moderationService } = await import('./src/services/moderationService.js');

  for (const campaign of testCampaigns) {
    console.log(`\n📋 Testing: ${campaign.title}`);
    console.log(`Type: ${campaign.need_type}, Goal: $${campaign.goal_amount}`);
    
    const result = await moderationService.analyzeCampaign(campaign);
    
    console.log('\n📊 Scores:');
    console.log(`  • Luxury Score: ${result.scores.luxury}% (lower is better)`);
    console.log(`  • Inappropriate: ${result.scores.inappropriate}% (lower is better)`);
    console.log(`  • Fraud Risk: ${result.scores.fraud}% (lower is better)`);
    console.log(`  • Need Validation: ${result.scores.needValidation}%`);
    console.log(`  • Trust Score: ${result.scores.trust}%`);
    console.log(`  • Overall Score: ${result.scores.overall}%`);
    
    console.log(`\n✅ Decision: ${result.decision.toUpperCase()}`);
    
    if (result.flags.length > 0) {
      console.log('🚩 Flags:', result.flags.join(', '));
    }
    
    if (result.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    if (result.details.luxuryItems.length > 0) {
      console.log('🏷️ Luxury Items Found:', result.details.luxuryItems.join(', '));
    }
    
    if (result.details.inappropriateContent.length > 0) {
      console.log('⚠️ Inappropriate Content:', result.details.inappropriateContent.join(', '));
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Test quick content check
async function testQuickCheck() {
  console.log('\n\n🔍 Testing Quick Content Check...\n');
  
  const { moderationService } = await import('./src/services/moderationService.js');
  
  const testPhrases = [
    'Help me buy food for my family',
    'I need a Rolex watch for my birthday',
    'Quick money guaranteed returns forex trading',
    'Medical bills from the hospital with receipts',
    'Send wire transfer urgent ASAP'
  ];
  
  for (const phrase of testPhrases) {
    const content = moderationService.extractTextContent({ story: phrase });
    const hasLuxury = moderationService.extractMatchedPatterns(content, [/\b(rolex|ferrari|luxury)\b/gi]).length > 0;
    const hasFraud = moderationService.extractMatchedPatterns(content, [/\b(quick money|guaranteed returns|wire transfer)\b/gi]).length > 0;
    
    console.log(`"${phrase}"`);
    console.log(`  Luxury: ${hasLuxury ? '❌ Yes' : '✅ No'}`);
    console.log(`  Fraud: ${hasFraud ? '❌ Yes' : '✅ No'}\n`);
  }
}

// Run tests
async function runAllTests() {
  try {
    await testModerationRules();
    await testQuickCheck();
    
    console.log('\n✅ All moderation tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();
