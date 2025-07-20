// Test script for Campaign Moderation Edge Function
// Run with: node test-moderation-edge-function.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test campaigns with different content types
const testCampaigns = [
  {
    // Good campaign - should be approved
    id: 'test-1',
    title: 'Help Fund Medical Treatment for Sarah',
    story: `My daughter Sarah has been diagnosed with leukemia and needs immediate treatment at St. Mary's Hospital. 
    The doctors have given us a treatment plan that includes chemotherapy and potential bone marrow transplant. 
    We have faith that God will guide us through this difficult time. Our church community has been praying for us.
    
    I will provide regular updates with receipts and documentation from the hospital. All funds will be used 
    transparently for medical expenses only. We are committed to full accountability.`,
    need_type: 'medical',
    goal_amount: 25000,
    budget_breakdown: [
      { item: 'Chemotherapy Sessions', amount: 15000, description: '6 sessions at $2,500 each' },
      { item: 'Hospital Stay', amount: 8000, description: 'Estimated 2 weeks' },
      { item: 'Medications', amount: 2000, description: 'Anti-nausea, pain management' }
    ],
    created_by: 'test-user-1'
  },
  
  {
    // Luxury items - should be rejected
    id: 'test-2',
    title: 'Fund My Dream Luxury Car',
    story: `I need a brand new Mercedes Benz to improve my life. I've always wanted a luxury car and 
    this is my chance. Please help me get this premium vehicle with all the latest features.`,
    need_type: 'personal',
    goal_amount: 80000,
    budget_breakdown: [
      { item: 'Mercedes Benz S-Class', amount: 75000 },
      { item: 'Premium Insurance', amount: 5000 }
    ],
    created_by: 'test-user-2'
  },
  
  {
    // Suspicious/scam - should be rejected
    id: 'test-3',
    title: 'URGENT: Quick Money Needed ASAP!!!',
    story: `Need money fast! Guaranteed returns if you help me. This is a once in a lifetime investment opportunity.
    Send funds via Western Union immediately. Double your money in 30 days!`,
    need_type: 'emergency',
    goal_amount: 50000,
    budget_breakdown: [],
    created_by: 'test-user-3'
  },
  
  {
    // Needs review - borderline case
    id: 'test-4',
    title: 'Education Support for Village Children',
    story: `I run a small school in our village. Need funds for supplies and basic needs. 
    God bless all donors. Will provide updates.`,
    need_type: 'education',
    goal_amount: 5000,
    budget_breakdown: [
      { item: 'School Supplies', amount: 2000 },
      { item: 'Teacher Salary', amount: 2000 },
      { item: 'Building Repairs', amount: 1000 }
    ],
    created_by: 'test-user-4'
  }
];

async function testModerationFunction() {
  console.log('🧪 Testing Campaign Moderation Edge Function\n');
  
  for (const campaign of testCampaigns) {
    console.log(`\n📋 Testing Campaign: ${campaign.title}`);
    console.log(`   Type: ${campaign.need_type}`);
    console.log(`   Goal: $${campaign.goal_amount.toLocaleString()}`);
    
    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('moderate-campaign', {
        body: { campaign }
      });

      if (error) {
        console.error(`❌ Error:`, error.message);
        continue;
      }

      if (data.success && data.result) {
        const result = data.result;
        console.log(`\n   ✅ Moderation Complete:`);
        console.log(`   📊 Scores:`);
        console.log(`      - Luxury: ${result.scores.luxury}/100`);
        console.log(`      - Inappropriate: ${result.scores.inappropriate}/100`);
        console.log(`      - Fraud: ${result.scores.fraud}/100`);
        console.log(`      - Need Validation: ${result.scores.needValidation}/100`);
        console.log(`      - Trust: ${result.scores.trust}/100`);
        console.log(`      - Overall: ${result.scores.overall}/100`);
        console.log(`\n   🎯 Decision: ${result.decision.toUpperCase()}`);
        
        if (result.flags.length > 0) {
          console.log(`   🚩 Flags: ${result.flags.join(', ')}`);
        }
        
        if (result.recommendations.length > 0) {
          console.log(`   💡 Recommendations:`);
          result.recommendations.forEach(rec => {
            console.log(`      - ${rec}`);
          });
        }
        
        if (result.details.luxuryItems.length > 0) {
          console.log(`   🏷️ Luxury Items Found: ${result.details.luxuryItems.join(', ')}`);
        }
        
        if (result.details.suspiciousPatterns.length > 0) {
          console.log(`   ⚠️ Suspicious Patterns: ${result.details.suspiciousPatterns.join(', ')}`);
        }
        
        console.log(`   ⏱️ Processing Time: ${result.processingTime}ms`);
      }
      
    } catch (err) {
      console.error(`❌ Unexpected error:`, err);
    }
  }
  
  console.log('\n\n✅ Moderation testing complete!');
}

// Test real campaign moderation via API
async function testRealCampaignModeration() {
  console.log('\n\n🔍 Testing with real campaign data...\n');
  
  // Fetch a real campaign if exists
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .limit(1);
    
  if (error || !campaigns || campaigns.length === 0) {
    console.log('No real campaigns found to test.');
    return;
  }
  
  const campaign = campaigns[0];
  console.log(`Testing real campaign: ${campaign.title}`);
  
  const { data, error: funcError } = await supabase.functions.invoke('moderate-campaign', {
    body: { campaignId: campaign.id }
  });
  
  if (funcError) {
    console.error('Error:', funcError);
  } else if (data.success) {
    console.log('Moderation result:', JSON.stringify(data.result, null, 2));
  }
}

// Run tests
testModerationFunction()
  .then(() => testRealCampaignModeration())
  .catch(console.error);
