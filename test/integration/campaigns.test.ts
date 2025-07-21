import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server';
import { createClient } from '@supabase/supabase-js';

describe('Campaign API Integration Tests', () => {
  let app: any;
  let supabase: any;
  let authToken: string;

  beforeAll(async () => {
    // Initialize test server
    app = await createServer({ test: true });
    
    // Initialize test database connection
    supabase = createClient(
      process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
      process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key'
    );

    // Create test user and get auth token
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@blessed-horizon.com',
      password: 'TestPassword123!',
    });
    authToken = authData?.session?.access_token || '';
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('campaigns').delete().match({ created_by: 'test-user' });
    await supabase.auth.admin.deleteUser('test-user');
  });

  describe('POST /api/v1/campaigns', () => {
    it('should create a new campaign when authenticated', async () => {
      const newCampaign = {
        title: 'Test Church Building Fund',
        description: 'Raising funds for a new church building in the community',
        goal_amount: 50000,
        category: 'religious',
        beneficiary_type: 'organization',
        end_date: '2025-12-31',
        media_urls: ['https://example.com/image1.jpg'],
      };

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCampaign)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          title: newCampaign.title,
          status: 'pending', // Should be pending for moderation
          trust_score: expect.any(Number),
        }),
      });
    });

    it('should reject campaign creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .send({ title: 'Unauthorized Campaign' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('authentication'),
      });
    });

    it('should validate required fields', async () => {
      const invalidCampaign = {
        title: 'Missing Required Fields',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCampaign)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation'),
        details: expect.arrayContaining([
          expect.stringContaining('goal_amount'),
          expect.stringContaining('description'),
        ]),
      });
    });
  });

  describe('GET /api/v1/campaigns', () => {
    beforeEach(async () => {
      // Create test campaigns
      await supabase.from('campaigns').insert([
        {
          title: 'Active Campaign 1',
          description: 'Test campaign 1',
          goal_amount: 10000,
          current_amount: 5000,
          status: 'active',
          created_by: 'test-user',
        },
        {
          title: 'Active Campaign 2',
          description: 'Test campaign 2',
          goal_amount: 20000,
          current_amount: 10000,
          status: 'active',
          created_by: 'test-user',
        },
      ]);
    });

    it('should list active campaigns with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns?page=1&limit=10')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            status: 'active',
          }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
        },
      });
    });

    it('should filter campaigns by category', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns?category=religious')
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'religious',
          }),
        ])
      );
    });
  });

  describe('POST /api/v1/campaigns/:id/donate', () => {
    let campaignId: string;

    beforeEach(async () => {
      // Create a test campaign
      const { data } = await supabase.from('campaigns').insert({
        title: 'Donation Test Campaign',
        description: 'Campaign for testing donations',
        goal_amount: 10000,
        current_amount: 0,
        status: 'active',
        created_by: 'test-user',
      }).single();
      
      campaignId = data?.id;
    });

    it('should process a donation successfully', async () => {
      const donation = {
        amount: 100,
        payment_method_id: 'pm_test_123',
        anonymous: false,
        message: 'God bless this ministry!',
      };

      const response = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/donate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(donation)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          donation_id: expect.any(String),
          amount: donation.amount,
          status: 'processing',
        }),
      });

      // Verify campaign amount was updated
      const { data: updatedCampaign } = await supabase
        .from('campaigns')
        .select('current_amount')
        .eq('id', campaignId)
        .single();

      expect(updatedCampaign?.current_amount).toBe(100);
    });

    it('should handle payment failures gracefully', async () => {
      const donation = {
        amount: 100,
        payment_method_id: 'pm_test_fail', // Special ID that triggers failure
      };

      const response = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/donate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(donation)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('payment'),
      });
    });
  });

  describe('GET /api/v1/campaigns/:id/trust-score', () => {
    let campaignId: string;

    beforeEach(async () => {
      const { data } = await supabase.from('campaigns').insert({
        title: 'Trust Score Test',
        description: 'Testing trust score endpoint',
        goal_amount: 5000,
        status: 'active',
        trust_score: 75,
        created_by: 'test-user',
      }).single();
      
      campaignId = data?.id;
    });

    it('should return trust score details', async () => {
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaignId}/trust-score`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          campaign_id: campaignId,
          trust_score: 75,
          factors: expect.objectContaining({
            verification_status: expect.any(String),
            content_quality: expect.any(Number),
            update_frequency: expect.any(Number),
            donor_trust: expect.any(Number),
          }),
          history: expect.any(Array),
        },
      });
    });
  });
});
