import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarIcon, Download, TrendingUp, TrendingDown, Users, Eye,
  DollarSign, Target, Share2, Heart, MessageSquare, Clock,
  Globe, Smartphone, Monitor, Tablet, ArrowUpRight, ArrowDownRight,
  FileText, RefreshCw, Filter, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import analyticsService from '@/services/analyticsService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    traffic: null,
    engagement: null,
    financial: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Check if user owns the campaign
  useEffect(() => {
    checkCampaignOwnership();
  }, [campaignId, user]);

  // Fetch all analytics data
  useEffect(() => {
    if (campaign && user?.id === campaign.recipient_id) {
      fetchAllAnalytics();
    }
  }, [campaign, dateRange]);

  const checkCampaignOwnership = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, user_profiles!campaigns_recipient_id_fkey(display_name)')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Campaign not found');
        return;
      }

      if (data.recipient_id !== user?.id) {
        setError('You do not have permission to view analytics for this campaign');
        return;
      }

      setCampaign(data);
    } catch (err) {
      console.error('Error checking campaign ownership:', err);
      setError('Failed to load campaign');
    }
  };

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overview, traffic, engagement, financial] = await Promise.all([
        analyticsService.getCampaignAnalytics(campaignId, dateRange),
        analyticsService.getCampaignTrafficAnalytics(campaignId, 30),
        analyticsService.getCampaignEngagementMetrics(campaignId, 30),
        analyticsService.getCampaignFinancialAnalytics(campaignId)
      ]);

      setAnalyticsData({
        overview,
        traffic,
        engagement,
        financial
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllAnalytics();
    setRefreshing(false);
  };

  const handleExportCSV = (data, filename) => {
    analyticsService.exportToCSV(data, filename);
  };

  const renderMetricCard = (title, value, change, icon, trend = 'up') => {
    const isPositive = trend === 'up' ? change >= 0 : change <= 0;
    const Icon = icon;
    const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change !== undefined && (
            <p className={cn(
              "text-xs flex items-center gap-1",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(change)}%
              <span className="text-muted-foreground ml-1">from last period</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate('/campaigns')} 
          className="mt-4"
        >
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const { overview, traffic, engagement, financial } = analyticsData;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campaign Analytics</h1>
          <p className="text-muted-foreground">{campaign?.title}</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderMetricCard(
              "Total Raised",
              `£${overview?.overview?.totalRaised?.toFixed(2) || '0.00'}`,
              12.5,
              DollarSign
            )}
            {renderMetricCard(
              "Goal Progress",
              `${overview?.overview?.progressPercentage || 0}%`,
              8.2,
              Target
            )}
            {renderMetricCard(
              "Total Donors",
              overview?.overview?.unique_donors || 0,
              23.1,
              Users
            )}
            {renderMetricCard(
              "Avg. Donation",
              `£${overview?.overview?.avgDonation?.toFixed(2) || '0.00'}`,
              -5.4,
              TrendingUp
            )}
          </div>

          {/* Donation Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Donation Trend</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportCSV(overview?.donationTrend || [], 'donation_trend')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <CardDescription>Daily donations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={overview?.donationTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Amount (£)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="donations" 
                    stroke="#10b981" 
                    name="Number of Donations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donor Geography */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Donor Countries</CardTitle>
                <CardDescription>Distribution by country</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overview?.donorGeography || []}
                      dataKey="amount"
                      nameKey="country"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(overview?.donorGeography || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Donations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Donations</CardTitle>
                <CardDescription>Latest contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(overview?.recentDonations || []).slice(0, 5).map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">{donation.donor_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(donation.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">£{donation.amount.toFixed(2)}</p>
                        {donation.message && (
                          <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                            "{donation.message}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-4">
          {/* Traffic Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderMetricCard(
              "Page Views",
              traffic?.dailyTraffic?.reduce((sum, day) => sum + day.pageViews, 0) || 0,
              15.3,
              Eye
            )}
            {renderMetricCard(
              "Unique Visitors",
              traffic?.dailyTraffic?.reduce((sum, day) => sum + day.uniqueVisitors, 0) || 0,
              8.7,
              Users
            )}
            {renderMetricCard(
              "Conversion Rate",
              `${traffic?.conversionRate || 0}%`,
              2.1,
              Target
            )}
            {renderMetricCard(
              "Avg. Time on Page",
              "2m 34s",
              -12.5,
              Clock,
              'down'
            )}
          </div>

          {/* Traffic Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Overview</CardTitle>
              <CardDescription>Page views and visitor trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={traffic?.dailyTraffic || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pageViews" 
                    stroke="#3b82f6" 
                    name="Page Views"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    stroke="#10b981" 
                    name="Unique Visitors"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={traffic?.trafficSources || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="source" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Visitor device types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(traffic?.deviceStats || []).map((device) => {
                    const Icon = device.device_type === 'mobile' ? Smartphone :
                                device.device_type === 'tablet' ? Tablet : Monitor;
                    return (
                      <div key={device.device_type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{device.device_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{device.visitors} visitors</span>
                          <span className="text-sm text-muted-foreground">({device.percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          {/* Engagement Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderMetricCard(
              "Total Followers",
              engagement?.totalFollowers || 0,
              32.1,
              Users
            )}
            {renderMetricCard(
              "Update Views",
              engagement?.engagementSummary?.total_views || 0,
              18.7,
              Eye
            )}
            {renderMetricCard(
              "Total Likes",
              engagement?.engagementSummary?.total_likes || 0,
              45.2,
              Heart
            )}
            {renderMetricCard(
              "Comments",
              engagement?.engagementSummary?.total_comments || 0,
              12.8,
              MessageSquare
            )}
          </div>

          {/* Follower Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Follower Growth</CardTitle>
              <CardDescription>Campaign follower trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={engagement?.followerGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="totalFollowers" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Total Followers"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newFollowers" 
                    stroke="#10b981" 
                    name="New Followers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Update Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Update Performance</CardTitle>
              <CardDescription>Engagement metrics for your updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(engagement?.updatePerformance || []).slice(0, 5).map((update) => (
                  <div key={update.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium capitalize">{update.type} Update</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(update.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-2xl font-bold">{update.view_count}</p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{update.like_count}</p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{update.comment_count}</p>
                        <p className="text-xs text-muted-foreground">Comments</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{update.share_count}</p>
                        <p className="text-xs text-muted-foreground">Shares</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          {/* Financial Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderMetricCard(
              "Total Revenue",
              `£${financial?.feeSummary?.totalRaised?.toFixed(2) || '0.00'}`,
              28.3,
              DollarSign
            )}
            {renderMetricCard(
              "Total Fees",
              `£${financial?.feeSummary?.totalFees?.toFixed(2) || '0.00'}`,
              undefined,
              TrendingDown
            )}
            {renderMetricCard(
              "Net Amount",
              `£${financial?.feeSummary?.totalNet?.toFixed(2) || '0.00'}`,
              undefined,
              DollarSign
            )}
            {renderMetricCard(
              "Pending Payout",
              `£${financial?.pendingPayout?.toFixed(2) || '0.00'}`,
              undefined,
              Clock
            )}
          </div>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Monthly Revenue</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportCSV(financial?.monthlyRevenue || [], 'monthly_revenue')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <CardDescription>Revenue breakdown by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financial?.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="gross" fill="#3b82f6" name="Gross Revenue" />
                  <Bar dataKey="fees" fill="#ef4444" name="Fees" />
                  <Bar dataKey="net" fill="#10b981" name="Net Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fee Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fee Summary</CardTitle>
                <CardDescription>Platform and processing fees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Raised</span>
                    <span className="font-medium">
                      £{financial?.feeSummary?.totalRaised?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Platform & Processing Fees</span>
                    <span className="font-medium">
                      -£{financial?.feeSummary?.totalFees?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium">Net Amount</span>
                    <span className="font-bold text-green-600">
                      £{financial?.feeSummary?.totalNet?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Effective fee rate: {financial?.feeSummary?.effectiveFeePercentage || 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payouts</CardTitle>
                <CardDescription>Withdrawal history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financial?.payoutHistory?.length > 0 ? (
                    financial.payoutHistory.slice(0, 5).map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            £{payout.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payout.initiated_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            payout.status === 'completed' 
                              ? "bg-green-100 text-green-700" 
                              : "bg-yellow-100 text-yellow-700"
                          )}>
                            {payout.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payouts yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
