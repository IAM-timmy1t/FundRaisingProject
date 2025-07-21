import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrustScoreService } from '../trustScore';

vi.mock('@supabase/supabase-js');

describe('TrustScoreService', () => {
  let trustScoreService: TrustScoreService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }),
    };
    
    trustScoreService = new TrustScoreService(mockSupabase);
  });

  describe('calculateTrustScore', () => {
    it('should calculate trust score based on multiple factors', async () => {
      const campaignId = 'campaign-123';
      
      // Mock campaign data
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: campaignId,
          created_at: '2025-01-01',
          description: 'A detailed description with proper grammar and clear goals',
          media_urls: ['url1', 'url2', 'url3'],
          verification_status: 'verified',
        },
        error: null,
      });

      // Mock donation history
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [
          { amount: 100 },
          { amount: 200 },
          { amount: 150 },
        ],
        error: null,
      });

      // Mock updates
      mockSupabase.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [
          { created_at: '2025-07-01' },
          { created_at: '2025-07-15' },
        ],
        error: null,
      });

      const score = await trustScoreService.calculateTrustScore(campaignId);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      
      // Verify all the necessary calls were made
      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from).toHaveBeenCalledWith('donations');
      expect(mockSupabase.from).toHaveBeenCalledWith('campaign_updates');
    });

    it('should penalize campaigns with poor content quality', async () => {
      const campaignId = 'campaign-456';
      
      // Mock campaign with poor quality content
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: campaignId,
          created_at: '2025-07-20', // Very recent
          description: 'plz help need money', // Poor grammar
          media_urls: [], // No media
          verification_status: 'unverified',
        },
        error: null,
      });

      // No donations
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // No updates
      mockSupabase.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const score = await trustScoreService.calculateTrustScore(campaignId);

      expect(score).toBeLessThan(50); // Should have a low trust score
    });
  });

  describe('updateTrustScore', () => {
    it('should update trust score and create event record', async () => {
      const campaignId = 'campaign-123';
      const newScore = 85;
      const reason = 'verification_completed';

      mockSupabase.from().update().eq().single.mockResolvedValueOnce({
        data: { id: campaignId, trust_score: newScore },
        error: null,
      });

      mockSupabase.from().insert().single.mockResolvedValueOnce({
        data: {
          campaign_id: campaignId,
          event_type: reason,
          score_change: 10,
          new_score: newScore,
        },
        error: null,
      });

      const result = await trustScoreService.updateTrustScore(campaignId, newScore, reason);

      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from).toHaveBeenCalledWith('trust_score_events');
      expect(result.trust_score).toBe(newScore);
    });
  });

  describe('getTrustScoreHistory', () => {
    it('should retrieve trust score history for a campaign', async () => {
      const campaignId = 'campaign-123';
      const mockHistory = [
        {
          event_type: 'initial_calculation',
          score_change: 50,
          new_score: 50,
          created_at: '2025-01-01',
        },
        {
          event_type: 'verification_completed',
          score_change: 20,
          new_score: 70,
          created_at: '2025-01-02',
        },
      ];

      mockSupabase.from().select().eq().order.mockResolvedValueOnce({
        data: mockHistory,
        error: null,
      });

      const history = await trustScoreService.getTrustScoreHistory(campaignId);

      expect(mockSupabase.from).toHaveBeenCalledWith('trust_score_events');
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('campaign_id', campaignId);
      expect(history).toEqual(mockHistory);
    });
  });
});
