// Comprehensive test for Campaign Moderation Edge Function
// Tests integration with campaign creation flow

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials (create a test user first)
const testUser = {
  email: 'test-moderation@example.com',
  password: 'TestPassword123!'
};

async function setupTestUser() {
  console.log('🔐 Setting up test user...');
  
  // Try to sign in first
  let { data: authData, error: signInError } = await supabase.auth.signInWithPassword(testUser);
  
  if (signInError) {
    // Create new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(testUser);
    
    if (signUpError) {
      console.error('Failed to create test user:', signUpError);
      return null;
    }
    
    authData = signUpData;
  }
  
  return authData.user;
}

async function testCampaignCreationWithModeration() {
  console.log('\n🧪 Testing Campaign Creation with Moderation\n');
  
  const user = await setupTestUser();
  if (!user) return;
  
  const testCampaigns = [
    {
      name: 'Legitimate Medical Campaign',
      data: {
        title: 'Help Sarah Fight Cancer',
        need_type: 'EMERGENCY',
        goal_amount: 25000,
        currency: 'USD',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        story_markdown: `My daughter Sarah was diagnosed with cancer at St. Mary's Hospital. 
        The doctors have recommended chemotherapy treatment that will take 6 months.
        
        We are a faithful family and believe God will see us through this difficult time.
        Our church community has been incredibly supportive with prayers and encouragement.
        
        I promise to provide regular updates with receipts and documentation from the hospital.
        All funds will be used transparently for medical expenses only.`,
        scripture_reference: 'Jeremiah 29:11',
        budget_breakdown: [
          { description: 'Chemotherapy Sessions (6 sessions)', amount: 15000, category: 'medical' },
          { description: 'Hospital Stay and Care', amount: 8000, category: 'medical' },
          { description: 'Medications and Supplies', amount: 2000, category: 'medical' }
        ],
        tags: ['medical', 'cancer', 'emergency']
      },
      expectedDecision: 'approved'
    },
    
    {
      name: 'Luxury Request Campaign',
      data: {
        title: 'Help Me Buy a Luxury Car',
        need_type: 'COMMUNITY_LONG_TERM',
        goal_amount: 75000,
        currency: 'USD',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        story_markdown: `I need a brand new Mercedes Benz to improve my quality of life. 
        I've always dreamed of owning a luxury vehicle with premium features.`,
        budget_breakdown: [
          { description: 'Mercedes Benz S-Class', amount: 70000, category: 'personal' },
          { description: 'Premium Insurance', amount: 5000, category: 'personal' }
        ],
        tags: ['personal', 'car']
      },
      expectedDecision: 'rejected'
    },
    
    {
      name: 'Borderline Education Campaign',
      data: {
        title: 'Support Village School Supplies',
        need_type: 'COMMUNITY_LONG_TERM',
        goal_amount: 5000,
        currency: 'USD',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        story_markdown: `Our village school needs basic supplies for children. 
        We serve 50 students from low-income families. God bless all supporters.`,
        budget_breakdown: [
          { description: 'School Supplies', amount: 2000, category: 'education' },
          { description: 'Teacher Support', amount: 2000, category: 'education' },
          { description: 'Facility Maintenance', amount: 1000, category: 'education' }
        ],
        tags: ['education', 'community']
      },
      expectedDecision: 'review'
    }
  ];
  
  for (const testCase of testCampaigns) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   Expected Decision: ${testCase.expectedDecision}`);
    
    try {
      // Create campaign via edge function
      const { data, error } = await supabase.functions.invoke('create-campaign', {
        body: testCase.data
      });
      
      if (error) {
        console.error('❌ Error creating campaign:', error);
        continue;
      }
      
      if (data.success && data.data) {
        const campaign = data.data;
        console.log(`\n✅ Campaign Created Successfully`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Status: ${campaign.status}`);
        
        if (campaign.moderation) {
          console.log(`\n📊 Moderation Results:`);
          console.log(`   Decision: ${campaign.moderation.decision}`);
          console.log(`   Score: ${campaign.moderation.score}/100`);
          
          if (campaign.moderation.flags?.length > 0) {
            console.log(`   Flags: ${campaign.moderation.flags.join(', ')}`);
          }
          
          if (campaign.moderation.recommendations?.length > 0) {
            console.log(`   Recommendations:`);
            campaign.moderation.recommendations.forEach(rec => {
              console.log(`      - ${rec}`);
            });
          }
          
          // Verify expected decision
          if (campaign.moderation.decision === testCase.expectedDecision) {
            console.log(`   ✅ Decision matches expected: ${testCase.expectedDecision}`);
          } else {
            console.log(`   ❌ Decision mismatch! Expected: ${testCase.expectedDecision}, Got: ${campaign.moderation.decision}`);
          }
        } else {
          console.log('   ⚠️ No moderation results returned');
        }
        
        // Check moderation history
        await checkModerationHistory(campaign.id);
        
        // Clean up - delete test campaign
        await cleanupCampaign(campaign.id);
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
    }
  }
}

async function checkModerationHistory(campaignId) {
  console.log(`\n🔍 Checking moderation history for campaign ${campaignId}`);
  
  const { data, error } = await supabase
    .from('campaign_moderation')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('moderated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching moderation history:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`   Found ${data.length} moderation record(s)`);
    const latest = data[0];
    console.log(`   Latest moderation:`);
    console.log(`      - Score: ${latest.moderation_score}`);
    console.log(`      - Decision: ${latest.decision}`);
    console.log(`      - Processing Time: ${latest.processing_time}ms`);
  } else {
    console.log('   No moderation history found');
  }
}

async function cleanupCampaign(campaignId) {
  // Delete campaign (cascades to moderation records)
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);
  
  if (!error) {
    console.log(`   🧹 Cleaned up test campaign ${campaignId}`);
  }
}

async function testDirectModerationFunction() {
  console.log('\n\n🔬 Testing Direct Moderation Function Call\n');
  
  const testContent = {
    id: 'direct-test-1',
    title: 'URGENT: Send Money Fast!!!',
    story: 'Need money urgently! Wire transfer to Western Union ASAP. Guaranteed returns!',
    need_type: 'emergency',
    goal_amount: 100000,
    budget_breakdown: [],
    created_by: 'test-user'
  };
  
  console.log('Testing obvious scam content...');
  
  const { data, error } = await supabase.functions.invoke('moderate-campaign', {
    body: { campaign: testContent }
  });
  
  if (error) {
    console.error('Error:', error);
  } else if (data.success && data.result) {
    console.log('Moderation Result:');
    console.log(JSON.stringify(data.result, null, 2));
  }
}

async function testModerationStats() {
  console.log('\n\n📈 Testing Moderation Statistics\n');
  
  const { data, error } = await supabase
    .rpc('get_moderation_stats', {
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error fetching stats:', error);
  } else if (data) {
    console.log('Moderation Statistics (Last 7 Days):');
    console.log(`   Total Moderated: ${data.total_moderated}`);
    console.log(`   Approved: ${data.approved_count}`);
    console.log(`   Under Review: ${data.review_count}`);
    console.log(`   Rejected: ${data.rejected_count}`);
    console.log(`   Avg Processing Time: ${Math.round(data.avg_processing_time)}ms`);
    console.log(`   Avg Moderation Score: ${Math.round(data.avg_moderation_score)}/100`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Moderation Tests\n');
  
  await testCampaignCreationWithModeration();
  await testDirectModerationFunction();
  await testModerationStats();
  
  console.log('\n\n✅ All tests completed!');
  
  // Sign out
  await supabase.auth.signOut();
}

runAllTests().catch(console.error);
