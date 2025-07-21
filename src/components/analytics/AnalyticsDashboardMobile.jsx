import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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
  FileText, RefreshCw, Filter, ChevronRight, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import analyticsService from '@/services/analyticsService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Mobile-optimized metric card
const MobileMetricCard = ({ title, value, change, icon: Icon, trend }) => (
  <Card className="p-4 touch-manipulation">
    <div className="flex items-center justify-between space-x-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        <p className="text-xl font-bold truncate">{value}</p>
        {change && (
          <div className={cn(
            "flex items-center text-xs mt-1",
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : 
             trend === 'down' ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  </Card>
);

// Mobile-optimized chart container
const MobileChartContainer = ({ title, children }) => (
  <Card className="touch-manipulation">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pb-3">
      <div className="h-48 -mx-2">
        {children}
      </div>
    </CardContent>
  </Card>
);

const AnalyticsDashboardMobile = () => {
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
        analyticsService.getCampaignFinancialAnalytics(campaignId, dateRange)
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

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setDatePickerOpen(false);
  };

  const exportAnalytics = async () => {
    try {
      const data = await analyticsService.exportCampaignAnalytics(
        campaignId,
        dateRange,
        'pdf'
      );
      // Handle file download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${campaignId}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate('/dashboard/campaigns')} 
          className="mt-4 w-full"
        >
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const { overview, traffic, engagement, financial } = analyticsData;

  return (
    <div className="pb-20">
      {/* Header with actions */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold truncate">{campaign?.title}</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="touch-manipulation"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
              <Drawer open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="touch-manipulation">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Select Date Range</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateRangeChange({
                          startDate: subDays(new Date(), 7),
                          endDate: new Date()
                        })}
                      >
                        Last 7 days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateRangeChange({
                          startDate: subDays(new Date(), 30),
                          endDate: new Date()
                        })}
                      >
                        Last 30 days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateRangeChange({
                          startDate: startOfMonth(new Date()),
                          endDate: endOfMonth(new Date())
                        })}
                      >
                        This month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateRangeChange({
                          startDate: subDays(new Date(), 90),
                          endDate: new Date()
                        })}
                      >
                        Last 3 months
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          {/* Swipeable tabs */}
          <ScrollArea className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 h-12">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="traffic" className="text-xs">Traffic</TabsTrigger>
                <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
              </TabsList>
            </Tabs>
          </ScrollArea>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-4">
        {activeTab === 'overview' && overview && (
          <div className="space-y-4">
            {/* Key metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="Total Raised"
                value={`$${overview.totalRaised.toLocaleString()}`}
                change={`${overview.raisedChange}%`}
                icon={DollarSign}
                trend={overview.raisedChange > 0 ? 'up' : 'down'}
              />
              <MobileMetricCard
                title="Goal Progress"
                value={`${overview.goalProgress}%`}
                change={`${overview.progressChange}%`}
                icon={Target}
                trend={overview.progressChange > 0 ? 'up' : 'down'}
              />
              <MobileMetricCard
                title="Donors"
                value={overview.totalDonors.toLocaleString()}
                change={`${overview.donorsChange}%`}
                icon={Users}
                trend={overview.donorsChange > 0 ? 'up' : 'down'}
              />
              <MobileMetricCard
                title="Views"
                value={overview.totalViews.toLocaleString()}
                change={`${overview.viewsChange}%`}
                icon={Eye}
                trend={overview.viewsChange > 0 ? 'up' : 'down'}
              />
            </div>

            {/* Progress chart */}
            <MobileChartContainer title="Daily Progress">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ fontSize: '12px' }}
                    formatter={(value) => [`$${value}`, 'Amount']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </MobileChartContainer>
          </div>
        )}

        {activeTab === 'traffic' && traffic && (
          <div className="space-y-4">
            {/* Traffic sources */}
            <MobileChartContainer title="Traffic Sources">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={traffic.sources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {traffic.sources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </MobileChartContainer>

            {/* Device breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center touch-manipulation">
                <Monitor className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Desktop</p>
                <p className="text-lg font-bold">{traffic.devices.desktop}%</p>
              </Card>
              <Card className="p-3 text-center touch-manipulation">
                <Smartphone className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-lg font-bold">{traffic.devices.mobile}%</p>
              </Card>
              <Card className="p-3 text-center touch-manipulation">
                <Tablet className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Tablet</p>
                <p className="text-lg font-bold">{traffic.devices.tablet}%</p>
              </Card>
            </div>

            {/* Top referrers list */}
            <Card className="touch-manipulation">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Referrers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {traffic.topReferrers.map((referrer, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{referrer.source}</span>
                      </div>
                      <span className="text-sm font-medium">{referrer.visits}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'engagement' && engagement && (
          <div className="space-y-4">
            {/* Engagement metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="Shares"
                value={engagement.totalShares.toLocaleString()}
                icon={Share2}
                trend="up"
              />
              <MobileMetricCard
                title="Likes"
                value={engagement.totalLikes.toLocaleString()}
                icon={Heart}
                trend="up"
              />
              <MobileMetricCard
                title="Comments"
                value={engagement.totalComments.toLocaleString()}
                icon={MessageSquare}
                trend="up"
              />
              <MobileMetricCard
                title="Avg. Time"
                value={engagement.avgTimeOnPage}
                icon={Clock}
                trend="up"
              />
            </div>

            {/* Engagement timeline */}
            <MobileChartContainer title="Engagement Timeline">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagement.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="shares" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="likes" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comments" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </MobileChartContainer>
          </div>
        )}

        {activeTab === 'financial' && financial && (
          <div className="space-y-4">
            {/* Financial summary */}
            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="Total Raised"
                value={`$${financial.totalRaised.toLocaleString()}`}
                icon={DollarSign}
                trend="up"
              />
              <MobileMetricCard
                title="Avg. Donation"
                value={`$${financial.avgDonation.toFixed(2)}`}
                icon={DollarSign}
                trend="up"
              />
              <MobileMetricCard
                title="Recurring"
                value={`$${financial.recurringAmount.toLocaleString()}`}
                icon={RefreshCw}
                trend="up"
              />
              <MobileMetricCard
                title="One-time"
                value={`$${financial.oneTimeAmount.toLocaleString()}`}
                icon={DollarSign}
                trend="up"
              />
            </div>

            {/* Donation distribution */}
            <MobileChartContainer title="Donation Distribution">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financial.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </MobileChartContainer>

            {/* Recent donations */}
            <Card className="touch-manipulation">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {financial.recentDonations.slice(0, 5).map((donation, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{donation.donor_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(donation.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <span className="text-sm font-bold">${donation.amount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export button */}
        <div className="pt-4">
          <Button 
            onClick={exportAnalytics} 
            className="w-full touch-manipulation"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardMobile;