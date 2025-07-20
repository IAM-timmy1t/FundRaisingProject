// Test Supabase Database Connection
// Run this in your browser console while on http://localhost:5173

import { supabase } from './src/lib/customSupabaseClient.js';

async function testDatabaseSetup() {
  console.log('🔍 Testing Supabase Database Setup...\n');
  
  // Test 1: Check authentication
  console.log('1️⃣ Testing Authentication...');
  const { data: session, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error('❌ Auth Error:', authError);
  } else {
    console.log('✅ Auth Working:', session ? 'Logged in' : 'Not logged in');
  }
  
  // Test 2: Check if tables exist
  console.log('\n2️⃣ Checking Tables...');
  const tables = ['user_profiles', 'campaigns', 'donations', 'campaign_updates'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Table '${table}':`, error.message);
      } else {
        console.log(`✅ Table '${table}': Exists (${count || 0} rows)`);
      }
    } catch (e) {
      console.error(`❌ Table '${table}':`, e.message);
    }
  }
  
  // Test 3: Check custom types
  console.log('\n3️⃣ Testing Custom Types...');
  try {
    const { data, error } = await supabase.rpc('get_enum_values', {
      enum_name: 'campaign_status'
    });
    
    if (error) {
      console.log('⚠️  Custom types check failed (this is normal if RPC function doesn\'t exist)');
    } else {
      console.log('✅ Custom types appear to be created');
    }
  } catch (e) {
    console.log('⚠️  Could not verify custom types');
  }
  
  // Test 4: Check if we can insert a test campaign (if logged in)
  if (session?.user) {
    console.log('\n4️⃣ Testing Campaign Creation...');
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          title: 'Test Campaign - Delete Me',
          need_type: 'EMERGENCY',
          goal_amount: 1000,
          story_markdown: 'This is a test campaign.',
          budget_breakdown: []
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Campaign Insert:', error.message);
      } else {
        console.log('✅ Campaign Insert: Success');
        // Clean up test campaign
        await supabase.from('campaigns').delete().eq('id', data.id);
      }
    } catch (e) {
      console.error('❌ Campaign Insert:', e.message);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('If you see errors above, the migrations may not have been applied yet.');
  console.log('Please follow the instructions in MIGRATION_INSTRUCTIONS.md');
}

// Run the test
testDatabaseSetup();
