// Test file for donation flow functionality
// Run with: npm test -- donation.test.js

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Donation Flow Tests', () => {
  let testCampaignId;
  let testUserId;
  let testDonationId;

  beforeAll(async () => {
    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-donor@blessed-horizon.com',
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;
    testUserId = authData.user.id;

    // Create a test campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        recipient_id: testUserId,
        title: 'Test Campaign for Donations',
        slug: 'test-campaign-donations',
        need_type: 'EMERGENCY',
        goal_amount: 1000,
        currency: 'USD',
        status: 'FUNDING',
        story_markdown: 'Test campaign for donation flow testing',
        scripture_reference: 'Test 1:1',
      })
      .select()
      .single();

    if (campaignError) throw campaignError;
    testCampaignId = campaign.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDonationId) {
      await supabase.from('donations').delete().eq('id', testDonationId);
    }
    if (testCampaignId) {
      await supabase.from('campaigns').delete().eq('id', testCampaignId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('Should create a donation record with pending status', async () => {
    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        campaign_id: testCampaignId,
        donor_id: testUserId,
        amount: 50.00,
        currency: 'USD',
        payment_status: 'pending',
        is_anonymous: false,
        donor_name: 'Test Donor',
        donor_email: 'test-donor@blessed-horizon.com',
        message: 'Test donation message',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(donation).toBeDefined();
    expect(donation.amount).toBe('50.00');
    expect(donation.payment_status).toBe('pending');
    
    testDonationId = donation.id;
  });

  test('Should allow guest donations without donor_id', async () => {
    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        campaign_id: testCampaignId,
        donor_id: null,
        amount: 25.00,
        currency: 'USD',
        payment_status: 'pending',
        is_anonymous: false,
        donor_name: 'Guest Donor',
        donor_email: 'guest@example.com',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(donation).toBeDefined();
    expect(donation.donor_id).toBeNull();
    expect(donation.donor_name).toBe('Guest Donor');

    // Cleanup
    await supabase.from('donations').delete().eq('id', donation.id);
  });

  test('Should update campaign raised amount when donation completes', async () => {
    // Get initial campaign state
    const { data: campaignBefore } = await supabase
      .from('campaigns')
      .select('raised_amount')
      .eq('id', testCampaignId)
      .single();

    const initialAmount = parseFloat(campaignBefore.raised_amount || 0);

    // Update donation to completed
    await supabase
      .from('donations')
      .update({ payment_status: 'completed' })
      .eq('id', testDonationId);

    // Wait for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check campaign raised amount increased
    const { data: campaignAfter } = await supabase
      .from('campaigns')
      .select('raised_amount')
      .eq('id', testCampaignId)
      .single();

    const finalAmount = parseFloat(campaignAfter.raised_amount);
    expect(finalAmount).toBe(initialAmount + 50.00);
  });

  test('Should enforce donation amount validation', async () => {
    const { error } = await supabase
      .from('donations')
      .insert({
        campaign_id: testCampaignId,
        amount: -10.00, // Negative amount
        currency: 'USD',
        donor_name: 'Test',
        donor_email: 'test@example.com',
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('check constraint');
  });

  test('Should calculate net amount correctly', async () => {
    const { data: donation } = await supabase
      .from('donations')
      .insert({
        campaign_id: testCampaignId,
        amount: 100.00,
        currency: 'USD',
        processing_fee: 3.20, // Stripe fee
        donor_name: 'Test',
        donor_email: 'test@example.com',
      })
      .select('amount, processing_fee, net_amount')
      .single();

    expect(donation.net_amount).toBe('96.80'); // 100 - 3.20

    // Cleanup
    await supabase.from('donations').delete().eq('amount', 100.00);
  });

  test('Should handle anonymous donations correctly', async () => {
    const { data: donation } = await supabase
      .from('donations')
      .insert({
        campaign_id: testCampaignId,
        donor_id: testUserId,
        amount: 30.00,
        currency: 'USD',
        is_anonymous: true,
        donor_name: null, // Should be null for anonymous
        donor_email: 'anon@example.com',
      })
      .select()
      .single();

    expect(donation.is_anonymous).toBe(true);
    expect(donation.donor_name).toBeNull();

    // Cleanup
    await supabase.from('donations').delete().eq('id', donation.id);
  });
});
