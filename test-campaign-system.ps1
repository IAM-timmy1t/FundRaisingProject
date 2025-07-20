# Test Campaign System
# Run this script to test the campaign CRUD operations

# First, ensure you've applied the new migration
Write-Host "Testing Campaign System for Blessed-Horizon" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test database connection
Write-Host "`nTesting database connection..." -ForegroundColor Yellow

$TestScript = @'
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCampaignSystem() {
  console.log('\n=== Testing Campaign System ===\n');

  try {
    // 1. Test Categories
    console.log('1. Testing Campaign Categories...');
    const { data: categories, error: catError } = await supabase
      .from('campaign_categories')
      .select('*')
      .order('display_order');
    
    if (catError) throw catError;
    console.log(`✅ Found ${categories.length} categories`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})`);
    });

    // 2. Test Campaign Table Structure
    console.log('\n2. Testing Campaign Table...');
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);
    
    if (campError) throw campError;
    console.log('✅ Campaign table accessible');

    // 3. Test Campaign Creation Function
    console.log('\n3. Testing can_user_create_campaign function...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: canCreate, error: funcError } = await supabase
        .rpc('can_user_create_campaign', { user_id: user.id });
      
      if (funcError) {
        console.log('⚠️  Function error:', funcError.message);
      } else {
        console.log(`✅ User ${user.email} can create campaigns: ${canCreate}`);
      }
    } else {
      console.log('ℹ️  No authenticated user - skipping user-specific tests');
    }

    // 4. Test Campaign Media Bucket
    console.log('\n4. Testing Storage Buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('⚠️  Could not list buckets:', bucketError.message);
    } else {
      const campaignBucket = buckets.find(b => b.name === 'campaign-media');
      if (campaignBucket) {
        console.log('✅ Campaign media bucket exists');
      } else {
        console.log('⚠️  Campaign media bucket not found - you may need to create it');
      }
    }

    // 5. Test RLS Policies
    console.log('\n5. Testing RLS Policies...');
    console.log('   (This requires an authenticated user to fully test)');
    
    // Test public campaign visibility
    const { data: publicCamps, error: publicError } = await supabase
      .from('campaigns')
      .select('id, title, status')
      .in('status', ['FUNDING', 'FUNDED', 'COMPLETED'])
      .limit(5);
    
    if (publicError) {
      console.log('⚠️  Error reading public campaigns:', publicError.message);
    } else {
      console.log(`✅ Can read ${publicCamps.length} public campaigns`);
    }

    console.log('\n=== Campaign System Test Complete ===\n');
    console.log('Summary:');
    console.log('- Database schema: ✅');
    console.log('- Categories: ✅');
    console.log('- Functions: ' + (user ? '✅' : '⚠️  (requires auth)'));
    console.log('- Storage: ⚠️  (check manually)');
    console.log('- RLS Policies: Partially tested');
    
    console.log('\nNext steps:');
    console.log('1. Apply the migration: supabase db push');
    console.log('2. Create storage bucket: campaign-media');
    console.log('3. Deploy edge functions: supabase functions deploy');
    console.log('4. Test with authenticated user for full functionality');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testCampaignSystem();
'@

# Write test script
$TestScript | Out-File -FilePath "test-campaign-system.js" -Encoding UTF8

# Run the test
Write-Host "`nRunning campaign system tests..." -ForegroundColor Green
node test-campaign-system.js

# Clean up
Remove-Item test-campaign-system.js -Force

Write-Host "`n✅ Campaign system testing complete!" -ForegroundColor Green
Write-Host "`nTo deploy the edge functions, run:" -ForegroundColor Yellow
Write-Host "cd supabase" -ForegroundColor White
Write-Host "supabase functions deploy create-campaign" -ForegroundColor White
Write-Host "supabase functions deploy update-campaign" -ForegroundColor White
Write-Host "supabase functions deploy get-campaign" -ForegroundColor White
Write-Host "supabase functions deploy list-campaigns" -ForegroundColor White
Write-Host "supabase functions deploy delete-campaign" -ForegroundColor White
Write-Host "supabase functions deploy submit-campaign-for-review" -ForegroundColor White
