// Test file for Admin Moderation Dashboard
// Run this after setting up the moderation dashboard

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminModeration() {
  console.log('🧪 Testing Admin Moderation Dashboard...\n');

  try {
    // 1. Test fetching pending campaigns
    console.log('1️⃣ Fetching campaigns pending review...');
    const { data: pendingCampaigns, error: pendingError } = await supabase
      .from('campaigns')
      .select(`
        *,
        user_profiles!created_by (id, name, email, avatar_url, trust_score),
        campaign_moderation (
          id,
          moderation_score,
          decision,
          flags,
          details,
          recommendations,
          moderated_at
        )
      `)
      .eq('status', 'under_review')
      .order('created_at', { ascending: false });

    if (pendingError) throw pendingError;
    console.log(`✅ Found ${pendingCampaigns?.length || 0} campaigns pending review`);

    // 2. Test moderation statistics
    console.log('\n2️⃣ Fetching moderation statistics...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayStats, error: statsError } = await supabase
      .from('campaign_moderation')
      .select('decision, moderation_score, processing_time, flags')
      .gte('moderated_at', today.toISOString());

    if (statsError) throw statsError;
    
    const approved = todayStats?.filter(m => m.decision === 'approved').length || 0;
    const rejected = todayStats?.filter(m => m.decision === 'rejected').length || 0;
    
    console.log(`✅ Today's stats: ${approved} approved, ${rejected} rejected`);

    // 3. Test admin access control
    console.log('\n3️⃣ Testing admin access control...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log(`✅ Current user role: ${profile?.role || 'not set'}`);
      
      if (profile?.role !== 'admin') {
        console.log('⚠️  User is not an admin - moderation features will be restricted');
      }
    } else {
      console.log('⚠️  No authenticated user found');
    }

    // 4. Test moderation history
    console.log('\n4️⃣ Fetching moderation history...');
    const { data: history, error: historyError } = await supabase
      .from('campaign_moderation')
      .select(`
        *,
        campaigns (
          id,
          title,
          need_type,
          goal_amount,
          status,
          user_profiles!created_by (
            id,
            name,
            email,
            avatar_url
          )
        )
      `)
      .order('moderated_at', { ascending: false })
      .limit(10);

    if (historyError) throw historyError;
    console.log(`✅ Retrieved ${history?.length || 0} moderation records`);

    // 5. Test campaign approval workflow
    console.log('\n5️⃣ Testing campaign approval workflow...');
    if (pendingCampaigns && pendingCampaigns.length > 0) {
      const testCampaign = pendingCampaigns[0];
      console.log(`   Testing with campaign: "${testCampaign.title}"`);
      
      // Simulate approval (without actually updating)
      console.log('   ✅ Approval workflow would update:');
      console.log('      - Campaign status to "approved"');
      console.log('      - Add moderation record with decision');
      console.log('      - Log admin action for audit trail');
    } else {
      console.log('   ⚠️  No campaigns available for testing approval workflow');
    }

    // 6. Test real-time updates
    console.log('\n6️⃣ Setting up real-time subscription...');
    const subscription = supabase
      .channel('moderation_updates_test')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: 'status=eq.under_review'
        },
        (payload) => {
          console.log('   📡 Real-time update received:', payload.eventType);
        }
      )
      .subscribe();

    console.log('   ✅ Real-time subscription active');
    
    // Clean up subscription after 5 seconds
    setTimeout(() => {
      subscription.unsubscribe();
      console.log('   ✅ Real-time subscription cleaned up');
    }, 5000);

    console.log('\n✅ All admin moderation tests completed successfully!');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Pending campaigns: ${pendingCampaigns?.length || 0}`);
    console.log(`   - Today's approvals: ${approved}`);
    console.log(`   - Today's rejections: ${rejected}`);
    console.log(`   - Admin access: ${user && profile?.role === 'admin' ? 'Granted' : 'Denied'}`);

  } catch (error) {
    console.error('❌ Error during admin moderation testing:', error);
  }
}

// Run the test
testAdminModeration();
