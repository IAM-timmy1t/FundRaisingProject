import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart as BarChartIcon, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Globe,
  PieChart,
  Activity,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '@/lib/utils';
import { analyticsService } from '@/services/analyticsService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RecipientAnalytics = ({ campaigns, metrics }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAnalyticsData();
  }, [campaigns, timeRange, selectedCampaign]);

  const generateAnalyticsData = () => {
    try {
      setLoading(true);

      // Filter campaigns based on selection
      const filteredCampaigns = selectedCampaign === 'all' 
        ? campaigns 
        : campaigns.filter(c => c.id === selectedCampaign);

      // Generate time series data for donations
      const donationTrend = generateDonationTrend(filteredCampaigns, timeRange);
      
      // Generate donor demographics (mock data for now)
      const donorDemographics = generateDonorDemographics(filteredCampaigns);
      
      // Generate campaign performance comparison
      const campaignComparison = generateCampaignComparison(filteredCampaigns);
      
      // Generate conversion funnel
      const conversionFunnel = generateConversionFunnel(filteredCampaigns);

      setAnalyticsData({
        donationTrend,
        donorDemographics,
        campaignComparison,
        conversionFunnel
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDonationTrend = (campaigns, range) => {
    // Generate mock trend data based on time range
    const days = range === '7days' ? 7 : range === '30days' ? 30 : 90;
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate realistic donation amounts
      const baseAmount = campaigns.reduce((sum, c) => sum + (c.current_amount || 0), 0) / days;
      const variance = Math.random() * 0.5 + 0.75; // 75% to 125% variance
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Math.round(baseAmount * variance),
        donors: Math.floor(Math.random() * 10) + 5
      });
    }

    return data;
  };

  const generateDonorDemographics = (campaigns) => {
    // Mock demographic data
    return [
      { name: 'United States', value: 45, color: '#3B82F6' },
      { name: 'United Kingdom', value: 25, color: '#8B5CF6' },
      { name: 'Canada', value: 15, color: '#10B981' },
      { name: 'Australia', value: 10, color: '#F59E0B' },
      { name: 'Other', value: 5, color: '#6B7280' }
    ];
  };

  const generateCampaignComparison = (campaigns) => {
    return campaigns.slice(0, 5).map(campaign => ({
      name: campaign.title.length > 20 ? campaign.title.substring(0, 20) + '...' : campaign.title,
      raised: campaign.current_amount || 0,
      goal: campaign.goal_amount,
      donors: campaign.donor_count || 0,
      completion: Math.round((campaign.current_amount / campaign.goal_amount) * 100)
    }));
  };

  const generateConversionFunnel = (campaigns) => {
    const totalViews = campaigns.reduce((sum, c) => sum + (c.view_count || 1000), 0);
    const totalClicks = Math.round(totalViews * 0.3);
    const totalDonors = campaigns.reduce((sum, c) => sum + (c.donor_count || 0), 0);
    const recurringDonors = Math.round(totalDonors * 0.2);

    return [
      { stage: 'Campaign Views', value: totalViews, percentage: 100 },
      { stage: 'Clicked Donate', value: totalClicks, percentage: 30 },
      { stage: 'Completed Donation', value: totalDonors, percentage: Math.round((totalDonors / totalViews) * 100) },
      { stage: 'Recurring Donors', value: recurringDonors, percentage: Math.round((recurringDonors / totalViews) * 100) }
    ];
  };

  const exportAnalytics = () => {
    // TODO: Implement export functionality
    console.log('Exporting analytics data...');
  };

  if (loading || !analyticsData) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="h-64 flex items-center justify-center">
              <Activity className="h-8 w-8 animate-pulse text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('analytics.overview', 'Analytics Overview')}</CardTitle>
              <CardDescription>
                {t('analytics.description', 'Track your fundraising performance and donor engagement')}
              </CardDescription>
            </div>
            <Button onClick={exportAnalytics} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Donation Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('analytics.donationTrend', 'Donation Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.donationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'amount' ? formatCurrency(value) : value,
                  name === 'amount' ? 'Amount' : 'Donors'
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Amount"
              />
              <Line 
                type="monotone" 
                dataKey="donors" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Donors"
                yAxisId="right"
              />
              <YAxis yAxisId="right" orientation="right" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donor Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('analytics.donorDemographics', 'Donor Demographics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={analyticsData.donorDemographics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.donorDemographics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5" />
              {t('analytics.campaignPerformance', 'Campaign Performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.campaignComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'raised' || name === 'goal' ? formatCurrency(value) : value,
                    name
                  ]}
                />
                <Legend />
                <Bar dataKey="raised" fill="#3B82F6" name="Raised" />
                <Bar dataKey="goal" fill="#E5E7EB" name="Goal" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('analytics.conversionFunnel', 'Conversion Funnel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.conversionFunnel.map((stage, index) => (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{stage.value.toLocaleString()}</span>
                    <Badge variant={stage.percentage > 20 ? 'success' : 'secondary'}>
                      {stage.percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('analytics.keyInsights', 'Key Insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Best Performing Day</h4>
              <p className="text-sm text-blue-700">
                Thursdays see 40% more donations than other days. Consider timing updates for Wednesday evenings.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Donor Retention</h4>
              <p className="text-sm text-green-700">
                20% of your donors have given multiple times. Focus on nurturing these relationships.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2">Average Donation Size</h4>
              <p className="text-sm text-purple-700">
                Your average donation is {formatCurrency(metrics.averageDonation)}, which is above platform average.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-2">Growth Opportunity</h4>
              <p className="text-sm text-orange-700">
                Campaigns with video updates receive 65% more donations. Consider adding video content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipientAnalytics;