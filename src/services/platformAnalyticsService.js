// Platform Analytics Service for Admin Dashboard
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

class PlatformAnalyticsService {
  // Get platform overview metrics
  async getPlatformOverview(dateRange = null) {
    try {
      const { data, error } = await supabase
        .rpc('get_platform_overview_metrics', {
          p_start_date: dateRange?.startDate || subDays(new Date(), 30),
          p_end_date: dateRange?.endDate || new Date()
        });

      if (error) throw error;

      return {
        totalCampaigns: data?.total_campaigns || 0,
        activeCampaigns: data?.active_campaigns || 0,
        totalDonations: data?.total_donations || 0,
        totalRaised: parseFloat(data?.total_raised || 0),
        totalUsers: data?.total_users || 0,
        activeUsers: data?.active_users || 0,
        avgDonation: parseFloat(data?.avg_donation || 0),
        platformGrowth: parseFloat(data?.platform_growth || 0)
      };
    } catch (error) {
      console.error('Error fetching platform overview:', error);
      throw error;
    }
  }

  // Get donor behavior analytics
  async getDonorBehaviorAnalytics(dateRange = null) {
    try {
      const { data, error } = await supabase
        .rpc('get_donor_behavior_analytics', {
          p_start_date: dateRange?.startDate || subDays(new Date(), 30),
          p_end_date: dateRange?.endDate || new Date()
        });

      if (error) throw error;

      return this.processDonorBehaviorData(data);
    } catch (error) {
      console.error('Error fetching donor behavior analytics:', error);
      throw error;
    }
  }

  // Get platform performance metrics
  async getPlatformPerformanceMetrics(daysBack = 30) {
    try {
      const { data, error } = await supabase
        .rpc('get_platform_performance_metrics', {
          p_days_back: daysBack
        });

      if (error) throw error;

      return this.processPlatformPerformanceData(data);
    } catch (error) {
      console.error('Error fetching platform performance:', error);
      throw error;
    }
  }

  // Get campaign category analytics
  async getCampaignCategoryAnalytics() {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_category_analytics');

      if (error) throw error;

      return data?.map(item => ({
        category: item.need_type,
        count: item.campaign_count,
        totalRaised: parseFloat(item.total_raised),
        avgGoal: parseFloat(item.avg_goal),
        successRate: parseFloat(item.success_rate),
        avgDonation: parseFloat(item.avg_donation)
      })) || [];
    } catch (error) {
      console.error('Error fetching category analytics:', error);
      throw error;
    }
  }

  // Get geographic distribution
  async getGeographicDistribution() {
    try {
      const { data, error } = await supabase
        .rpc('get_geographic_distribution');

      if (error) throw error;

      return {
        donorCountries: data?.donor_countries || [],
        recipientCountries: data?.recipient_countries || []
      };
    } catch (error) {
      console.error('Error fetching geographic distribution:', error);
      throw error;
    }
  }

  // Get platform revenue analytics
  async getPlatformRevenueAnalytics(dateRange = null) {
    try {
      const { data, error } = await supabase
        .rpc('get_platform_revenue_analytics', {
          p_start_date: dateRange?.startDate || subDays(new Date(), 365),
          p_end_date: dateRange?.endDate || new Date()
        });

      if (error) throw error;

      return this.processRevenueData(data);
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  // Get user growth analytics
  async getUserGrowthAnalytics(daysBack = 30) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_growth_analytics', {
          p_days_back: daysBack
        });

      if (error) throw error;

      return data?.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        newUsers: item.new_users,
        totalUsers: item.cumulative_users,
        activeDonors: item.active_donors,
        activeRecipients: item.active_recipients
      })) || [];
    } catch (error) {
      console.error('Error fetching user growth:', error);
      throw error;
    }
  }

  // Get campaign success metrics
  async getCampaignSuccessMetrics() {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_success_metrics');

      if (error) throw error;

      return {
        overallSuccessRate: parseFloat(data?.overall_success_rate || 0),
        avgTimeToGoal: data?.avg_time_to_goal || 0,
        avgCompletionPercentage: parseFloat(data?.avg_completion_percentage || 0),
        successByCategory: data?.success_by_category || []
      };
    } catch (error) {
      console.error('Error fetching campaign success metrics:', error);
      throw error;
    }
  }

  // Get trust score distribution
  async getTrustScoreDistribution() {
    try {
      const { data, error } = await supabase
        .rpc('get_trust_score_distribution');

      if (error) throw error;

      return data?.map(item => ({
        tier: item.trust_tier,
        count: item.user_count,
        percentage: parseFloat(item.percentage)
      })) || [];
    } catch (error) {
      console.error('Error fetching trust score distribution:', error);
      throw error;
    }
  }

  // Process donor behavior data
  processDonorBehaviorData(data) {
    if (!data) return null;

    return {
      donationFrequency: data.donation_frequency || [],
      donationAmountDistribution: data.donation_amount_distribution || [],
      repeatDonorRate: parseFloat(data.repeat_donor_rate || 0),
      avgDonationsPerDonor: parseFloat(data.avg_donations_per_donor || 0),
      topDonationTimes: data.top_donation_times || [],
      donorRetention: data.donor_retention || []
    };
  }

  // Process platform performance data
  processPlatformPerformanceData(data) {
    if (!data) return null;

    const dailyMetrics = (data.daily_metrics || []).map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      campaigns: item.new_campaigns,
      donations: item.donations,
      revenue: parseFloat(item.revenue),
      activeUsers: item.active_users
    }));

    return {
      dailyMetrics,
      conversionRate: parseFloat(data.overall_conversion_rate || 0),
      avgSessionDuration: data.avg_session_duration || 0,
      bounceRate: parseFloat(data.bounce_rate || 0),
      topReferrers: data.top_referrers || []
    };
  }

  // Process revenue data
  processRevenueData(data) {
    if (!data) return null;

    const monthlyRevenue = (data.monthly_revenue || []).map(item => ({
      month: format(new Date(item.month), 'MMM yyyy'),
      gross: parseFloat(item.gross_revenue),
      platformFees: parseFloat(item.platform_fees),
      processorFees: parseFloat(item.processor_fees),
      netRevenue: parseFloat(item.net_revenue),
      transactionCount: item.transaction_count
    }));

    return {
      monthlyRevenue,
      totalRevenue: parseFloat(data.total_revenue || 0),
      totalFees: parseFloat(data.total_fees || 0),
      avgTransactionFee: parseFloat(data.avg_transaction_fee || 0),
      revenueGrowth: parseFloat(data.revenue_growth || 0)
    };
  }

  // Generate platform report
  async generatePlatformReport(reportType, dateRange, format = 'csv') {
    try {
      let data;
      let filename;

      switch (reportType) {
        case 'overview':
          data = await this.getPlatformOverview(dateRange);
          filename = 'platform_overview_report';
          break;
        case 'donor_behavior':
          data = await this.getDonorBehaviorAnalytics(dateRange);
          filename = 'donor_behavior_report';
          break;
        case 'revenue':
          data = await this.getPlatformRevenueAnalytics(dateRange);
          filename = 'revenue_report';
          break;
        case 'campaign_performance':
          data = await this.getCampaignSuccessMetrics();
          filename = 'campaign_performance_report';
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (format === 'csv') {
        this.exportToCSV(data, filename);
      } else if (format === 'json') {
        this.exportToJSON(data, filename);
      }

      return { success: true };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Export to CSV
  exportToCSV(data, filename) {
    let csv = '';
    
    if (Array.isArray(data)) {
      csv = this.convertArrayToCSV(data);
    } else if (typeof data === 'object') {
      csv = this.convertObjectToCSV(data);
    }

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

  // Export to JSON
  exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Convert array to CSV
  convertArrayToCSV(data) {
    if (data.length === 0) return '';

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

  // Convert object to CSV
  convertObjectToCSV(data) {
    const rows = [];
    
    const processObject = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          processObject(value, fullKey);
        } else if (Array.isArray(value)) {
          rows.push([fullKey, JSON.stringify(value)]);
        } else {
          rows.push([fullKey, value]);
        }
      });
    };

    processObject(data);
    
    const csvContent = ['Key,Value', ...rows.map(row => row.join(','))].join('\n');
    return csvContent;
  }
}

export default new PlatformAnalyticsService();
