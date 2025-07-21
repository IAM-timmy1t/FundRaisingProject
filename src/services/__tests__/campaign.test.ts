import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Campaign, CampaignService } from '../campaign';

// Mock Supabase client
vi.mock('@supabase/supabase-js');

describe('CampaignService', () => {
  let campaignService: CampaignService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      }),
    };
    
    (createClient as any).mockReturnValue(mockSupabase);
    campaignService = new CampaignService();
  });

  describe('createCampaign', () => {
    it('should create a new campaign successfully', async () => {
      const newCampaign = {
        title: 'Help Build a Church',
        description: 'Raising funds for a new church building',
        goal_amount: 50000,
        category: 'religious',
        beneficiary_type: 'organization',
        end_date: '2025-12-31',
      };

      const mockResponse = {
        data: { id: '123', ...newCampaign, status: 'pending' },
        error: null,
      };

      mockSupabase.from().insert().single.mockResolvedValue(mockResponse);

      const result = await campaignService.createCampaign(newCampaign);

      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(newCampaign);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when creating a campaign', async () => {
      const mockError = {
        data: null,
        error: { message: 'Database error' },
      };

      mockSupabase.from().insert().single.mockResolvedValue(mockError);

      await expect(campaignService.createCampaign({})).rejects.toThrow('Database error');
    });
  });

  describe('getCampaignById', () => {
    it('should fetch a campaign by ID', async () => {
      const mockCampaign = {
        id: '123',
        title: 'Test Campaign',
        goal_amount: 10000,
        current_amount: 5000,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockCampaign,
        error: null,
      });

      const result = await campaignService.getCampaignById('123');

      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('listCampaigns', () => {
    it('should list campaigns with pagination', async () => {
      const mockCampaigns = [
        { id: '1', title: 'Campaign 1' },
        { id: '2', title: 'Campaign 2' },
      ];

      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockCampaigns,
        error: null,
        count: 2,
      });

      const result = await campaignService.listCampaigns({ page: 1, limit: 10 });

      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from().select().order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.from().select().order().range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual({ campaigns: mockCampaigns, total: 2 });
    });
  });

  describe('updateCampaign', () => {
    it('should update a campaign successfully', async () => {
      const updates = { current_amount: 7500 };
      const mockUpdated = { id: '123', ...updates };

      mockSupabase.from().update().eq().single.mockResolvedValue({
        data: mockUpdated,
        error: null,
      });

      const result = await campaignService.updateCampaign('123', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
      expect(mockSupabase.from().update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockUpdated);
    });
  });
});
