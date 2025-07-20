// Analytics Service for Campaign Dashboard
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

class AnalyticsService {
  // Track page views and events
  async trackEvent(eventData) {
    try {
      // Get or create session ID
      const sessionId = this.getSessionId();
      
      // Get device info
      const deviceInfo = this.getDeviceInfo();
      
      // Get referrer info
      const referrerInfo = this.getReferrerInfo();
      
      const { error } = await supabase
        .from('campaign_analytics_events')
        .insert({
          ...eventData,
          session_id: sessionId,
          user_id: (await supabase.auth.getUser()).data?.user?.id || null,
          ip_address: null, // Will be set by edge function for privacy
          user_agent: navigator.userAgent,
          ...deviceInfo,
          ...referrerInfo,
          timestamp: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error tracking event:', error);
      }
    } catch (err) {
      console.error('Failed to track event:', err);
    }
  }

  // Track campaign page view
  async trackCampaignView(campaignId) {
    await this.trackEvent({
      campaign_id: campaignId,
      event_type: 'page_view',
      event_data: {
        path: window.location.pathname,
        title: document.title
      }
    });
  }

  // Track donation events
  async trackDonationEvent(campaignId, eventType, eventData = {}) {
    await this.trackEvent({
      campaign_id: campaignId,
      event_type: eventType,
      event_data: eventData
    });
  }

  // Get campaign analytics
  async getCampaignAnalytics(campaignId, dateRange = null) {
    try {
      let startDate = null;
      let endDate = null;

      if (dateRange) {
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      }

      const { data, error } = await supabase
        .rpc('get_campaign_analytics', {
          p_campaign_id: campaignId,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) throw error;

      return this.processAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }

  // Get traffic analytics
  async getCampaignTrafficAnalytics(campaignId, daysBack = 30) {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_traffic_analytics', {
          p_campaign_id: campaignId,
          p_days_back: daysBack
        });

      if (error) throw error;

      return this.processTrafficData(data);
    } catch (error) {
      console.error('Error fetching traffic analytics:', error);
      throw error;
    }
  }

  // Get engagement metrics
  async getCampaignEngagementMetrics(campaignId, daysBack = 30) {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_engagement_metrics', {
          p_campaign_id: campaignId,
          p_days_back: daysBack
        });

      if (error) throw error;

      return this.processEngagementData(data);
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      throw error;
    }
  }

  // Get financial analytics
  async getCampaignFinancialAnalytics(campaignId) {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_financial_analytics', {
          p_campaign_id: campaignId
        });

      if (error) throw error;

      return this.processFinancialData(data);
    } catch (error) {
      console.error('Error fetching financial analytics:', error);
      throw error;
    }
  }

  // Process analytics data for charts
  processAnalyticsData(data) {
    if (!data) return null;

    // Process donation trend for chart
    const donationTrend = (data.donation_trend || []).map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      donations: item.donation_count,
      amount: parseFloat(item.daily_amount)
    }));

    // Process donor geography for chart
    const donorGeography = (data.donor_geography || []).map(item => ({
      country: item.country,
      donors: item.donor_count,
      amount: parseFloat(item.total_amount)
    }));

    return {
      overview: {
        ...data.overview,
        totalRaised: parseFloat(data.overview?.total_raised || 0),
        goalAmount: parseFloat(data.overview?.goal_amount || 0),
        avgDonation: parseFloat(data.overview?.avg_donation || 0),
        progressPercentage: parseFloat(data.overview?.progress_percentage || 0)
      },
      donationTrend,
      donorGeography,
      recentDonations: data.recent_donations || []
    };
  }

  // Process traffic data for charts
  processTrafficData(data) {
    if (!data) return null;

    // Process daily traffic for chart
    const dailyTraffic = (data.daily_traffic || []).map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      pageViews: item.page_views,
      uniqueVisitors: item.unique_visitors,
      donationStarts: item.donation_starts,
      donationCompletions: item.donation_completions
    }));

    // Process traffic sources for chart
    const trafficSources = (data.traffic_sources || []).map(item => ({
      source: item.source,
      visitors: item.visitors,
      conversions: item.conversions,
      conversionRate: item.visitors > 0 ? (item.conversions / item.visitors * 100).toFixed(2) : 0
    }));

    return {
      dailyTraffic,
      trafficSources,
      deviceStats: data.device_stats || [],
      conversionRate: parseFloat(data.conversion_rate || 0)
    };
  }

  // Process engagement data for charts
  processEngagementData(data) {
    if (!data) return null;

    // Process follower growth for chart
    const followerGrowth = (data.follower_growth || []).map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      newFollowers: item.new_followers,
      totalFollowers: item.cumulative_followers
    }));

    return {
      updatePerformance: data.update_performance || [],
      engagementSummary: data.engagement_summary || {},
      followerGrowth,
      totalFollowers: data.total_followers || 0
    };
  }

  // Process financial data for charts
  processFinancialData(data) {
    if (!data) return null;

    // Process monthly revenue for chart
    const monthlyRevenue = (data.monthly_revenue || []).map(item => ({
      month: format(new Date(item.month), 'MMM yyyy'),
      gross: parseFloat(item.gross_amount),
      fees: parseFloat(item.total_platform_fees) + parseFloat(item.total_processor_fees),
      net: parseFloat(item.total_net_amount),
      donations: item.donation_count
    }));

    return {
      monthlyRevenue,
      payoutHistory: data.payout_history || [],
      feeSummary: {
        ...data.fee_summary,
        totalRaised: parseFloat(data.fee_summary?.total_raised || 0),
        totalFees: parseFloat(data.fee_summary?.total_platform_fees || 0) + 
                   parseFloat(data.fee_summary?.total_processor_fees || 0),
        totalNet: parseFloat(data.fee_summary?.total_net_amount || 0),
        effectiveFeePercentage: parseFloat(data.fee_summary?.effective_fee_percentage || 0)
      },
      pendingPayout: parseFloat(data.pending_payout || 0)
    };
  }

  // Export analytics data to CSV
  exportToCSV(data, filename) {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Convert data to CSV format
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Utility functions
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isTablet = /iPad|Android.*Tablet/i.test(userAgent);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    // Detect browser
    let browser = 'Other';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    let os = 'Other';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { device_type: deviceType, browser, os };
  }

  getReferrerInfo() {
    const referrer = document.referrer;
    if (!referrer) return { referrer_source: 'Direct', referrer_url: null };

    try {
      const url = new URL(referrer);
      let source = url.hostname;

      // Categorize common sources
      if (source.includes('google')) source = 'Google';
      else if (source.includes('facebook')) source = 'Facebook';
      else if (source.includes('twitter')) source = 'Twitter';
      else if (source.includes('instagram')) source = 'Instagram';
      else if (source.includes('linkedin')) source = 'LinkedIn';
      else if (source.includes('youtube')) source = 'YouTube';

      return { referrer_source: source, referrer_url: referrer };
    } catch {
      return { referrer_source: 'Other', referrer_url: referrer };
    }
  }

  // Compare two campaigns
  async compareCampaigns(campaignIds, metric = 'donations') {
    try {
      const promises = campaignIds.map(id => this.getCampaignAnalytics(id));
      const results = await Promise.all(promises);

      return results.map((data, index) => ({
        campaignId: campaignIds[index],
        data: data
      }));
    } catch (error) {
      console.error('Error comparing campaigns:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
