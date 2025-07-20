import { useEffect } from 'react';
import analyticsService from '@/services/analyticsService';

const useAnalyticsTracking = (campaignId, eventType = 'page_view') => {
  useEffect(() => {
    if (campaignId) {
      // Track page view
      if (eventType === 'page_view') {
        analyticsService.trackCampaignView(campaignId);
      }
    }
  }, [campaignId, eventType]);
};

export default useAnalyticsTracking;
