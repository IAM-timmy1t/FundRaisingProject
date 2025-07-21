import React, { useState, useEffect } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  CalendarIcon, Download, TrendingUp, TrendingDown, Users, Activity,
  DollarSign, Target, Globe, Award, FileText, RefreshCw, Filter,
  BarChart3, PieChartIcon, TrendingUpIcon, MapPin, Shield, Clock, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import platformAnalyticsService from '@/services/platformAnalyticsService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSwipeable } from 'react-swipeable';
import MobileTabNavigation from '@/components/shared/MobileTabNavigation';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PlatformAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    donorBehavior: null,
    performance: null,
    categories: null,
    geographic: null,
    revenue: null,
    userGrowth: null,
    campaignSuccess: null,
    trustScores: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pull to refresh implementation
  const { isPulling, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      setRefreshing(true);
      await fetchAllAnalytics();
      setRefreshing(false);
    },
    threshold: 80,
    enabled: isMobile && isAdmin
  });

  // Swipe navigation for tabs
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const tabs = ['overview', 'users', 'campaigns', 'financial', 'reports'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const tabs = ['overview', 'users', 'campaigns', 'financial', 'reports'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    },
    trackMouse: false
  });

  // Check if user is admin
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  // Fetch all analytics data
  useEffect(() => {
    if (isAdmin) {
      fetchAllAnalytics();
    }
  }, [isAdmin, dateRange]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.role !== 'admin') {
        setError('You do not have permission to view platform analytics');
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Failed to verify permissions');
    }
  };

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        overview,
        donorBehavior,
        performance,
        categories,
        geographic,
        revenue,
        userGrowth,
        campaignSuccess,
        trustScores
      ] = await Promise.all([
        platformAnalyticsService.getPlatformOverview(dateRange),
        platformAnalyticsService.getDonorBehaviorAnalytics(dateRange),
        platformAnalyticsService.getPlatformPerformanceMetrics(30),
        platformAnalyticsService.getCampaignCategoryAnalytics(),
        platformAnalyticsService.getGeographicDistribution(),
        platformAnalyticsService.getPlatformRevenueAnalytics(dateRange),
        platformAnalyticsService.getUserGrowthAnalytics(30),
        platformAnalyticsService.getCampaignSuccessMetrics(),
        platformAnalyticsService.getTrustScoreDistribution()
      ]);

      setAnalyticsData({
        overview,
        donorBehavior,
        performance,
        categories,
        geographic,
        revenue,
        userGrowth,
        campaignSuccess,
        trustScores
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

  const handleExportReport = async (reportType) => {
    setExportLoading(true);
    try {
      await platformAnalyticsService.generatePlatformReport(reportType, dateRange, 'csv');
    } catch (err) {
      console.error('Error exporting report:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const renderMetricCard = (title, value, change, icon, trend = 'up') => {
    const isPositive = trend === 'up' ? change >= 0 : change <= 0;
    const Icon = icon;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Card className="touch-manipulation">
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0",
          isMobile ? "p-3" : "pb-2"
        )}>
          <CardTitle className={cn(
            "font-medium",
            isMobile ? "text-xs" : "text-sm"
          )}>{title}</CardTitle>
          <Icon className={cn(
            "text-muted-foreground",
            isMobile ? "h-3 w-3" : "h-4 w-4"
          )} />
        </CardHeader>
        <CardContent className={isMobile ? "p-3 pt-0" : ""}>
          <div className={cn(
            "font-bold",
            isMobile ? "text-lg" : "text-2xl"
          )}>{value}</div>
          {change !== undefined && !isMobile && (
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

  const MobileHeader = () => (
    <div className="md:hidden flex justify-between items-center mb-4">
      <h1 className="text-xl font-bold">Platform Analytics</h1>
      <div className="flex gap-2">
        <Sheet open={showDatePicker} onOpenChange={setShowDatePicker}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[400px]">
            <SheetHeader>
              <SheetTitle>Select Date Range</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <Calendar
                mode="range"
                selected={{ from: dateRange.startDate, to: dateRange.endDate }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({
                      startDate: range.from,
                      endDate: range.to
                    });
                    setShowDatePicker(false);
                  }
                }}
                initialFocus
              />
            </div>
          </SheetContent>
        </Sheet>
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
  );

  const MobileChartWrapper = ({ children, height = 200 }) => (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const {
    overview,
    donorBehavior,
    performance,
    categories,
    geographic,
    revenue,
    userGrowth,
    campaignSuccess,
    trustScores
  } = analyticsData;

  const tabs = [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'campaigns', label: 'Campaigns', icon: Target },
    { value: 'financial', label: 'Financial', icon: DollarSign },
    { value: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
          <div 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-b-lg shadow-lg transition-transform"
            style={{ transform: `translateY(${Math.min(pullDistance - 40, 40)}px)` }}
          >
            {refreshing ? 'Refreshing...' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <MobileHeader />

      {/* Desktop Header */}
      {!isMobile && (
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.startDate, 'MMM d')} - {format(dateRange.endDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.startDate, to: dateRange.endDate }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({
                        startDate: range.from,
                        endDate: range.to
                      });
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {isMobile ? (
        <MobileTabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users & Behavior</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Tab Content with swipe support */}
      <div {...swipeHandlers}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Key Metrics */}
                <div className={cn(
                  "grid gap-3 md:gap-4",
                  isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
                )}>
                  {renderMetricCard(
                    "Total Campaigns",
                    overview?.totalCampaigns || 0,
                    overview?.platformGrowth,
                    Target
                  )}
                  {renderMetricCard(
                    "Total Raised",
                    `£${(overview?.totalRaised || 0).toFixed(0)}`,
                    15.3,
                    DollarSign
                  )}
                  {renderMetricCard(
                    "Total Users",
                    overview?.totalUsers || 0,
                    8.7,
                    Users
                  )}
                  {renderMetricCard(
                    "Total Donations",
                    overview?.totalDonations || 0,
                    12.1,
                    Activity
                  )}
                </div>

                {/* Platform Performance Chart */}
                <Card>
                  <CardHeader className={isMobile ? "p-4" : ""}>
                    <CardTitle className={isMobile ? "text-base" : ""}>Platform Performance</CardTitle>
                    {!isMobile && <CardDescription>Daily activity metrics</CardDescription>}
                  </CardHeader>
                  <CardContent className={isMobile ? "p-2" : ""}>
                    {isMobile ? (
                      <MobileChartWrapper height={250}>
                        <LineChart data={performance?.dailyMetrics || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ fontSize: 12 }}
                            itemStyle={{ fontSize: 11 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Revenue (£)"
                          />
                          <Line
                            type="monotone"
                            dataKey="campaigns"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="Campaigns"
                          />
                        </LineChart>
                      </MobileChartWrapper>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={performance?.dailyMetrics || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                            name="Revenue (£)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="campaigns"
                            stroke="#10b981"
                            name="New Campaigns"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="donations"
                            stroke="#f59e0b"
                            name="Donations"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <div className={cn(
                  "grid gap-4",
                  isMobile ? "grid-cols-1" : "md:grid-cols-2"
                )}>
                  {/* Category Distribution */}
                  <Card>
                    <CardHeader className={isMobile ? "p-4" : ""}>
                      <CardTitle className={isMobile ? "text-base" : ""}>Campaign Categories</CardTitle>
                      {!isMobile && <CardDescription>Distribution by need type</CardDescription>}
                    </CardHeader>
                    <CardContent className={isMobile ? "p-2" : ""}>
                      {isMobile ? (
                        <div className="space-y-2">
                          {(categories || []).map((cat, index) => (
                            <div key={cat.category} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm capitalize">{cat.category}</span>
                              </div>
                              <span className="text-sm font-medium">
                                {((cat.count / (categories || []).reduce((sum, c) => sum + c.count, 0)) * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={categories || []}
                              dataKey="count"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ category, percentage }) => `${category} ${(percentage * 100).toFixed(0)}%`}
                            >
                              {(categories || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trust Score Distribution */}
                  <Card>
                    <CardHeader className={isMobile ? "p-4" : ""}>
                      <CardTitle className={isMobile ? "text-base" : ""}>Trust Score Distribution</CardTitle>
                      {!isMobile && <CardDescription>User trust tiers</CardDescription>}
                    </CardHeader>
                    <CardContent className={isMobile ? "p-2" : ""}>
                      {isMobile ? (
                        <MobileChartWrapper height={200}>
                          <BarChart data={trustScores || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="tier" 
                              tick={{ fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip 
                              contentStyle={{ fontSize: 12 }}
                              itemStyle={{ fontSize: 11 }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" name="Users" />
                          </BarChart>
                        </MobileChartWrapper>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={trustScores || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="tier" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" name="Users" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Users & Behavior Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* User Metrics */}
                <div className={cn(
                  "grid gap-3 md:gap-4",
                  isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
                )}>
                  {renderMetricCard(
                    "Active Users",
                    overview?.activeUsers || 0,
                    12.5,
                    Users
                  )}
                  {renderMetricCard(
                    "Repeat Donor Rate",
                    `${(donorBehavior?.repeatDonorRate || 0).toFixed(1)}%`,
                    3.2,
                    Award
                  )}
                  {renderMetricCard(
                    "Avg Donations/Donor",
                    (donorBehavior?.avgDonationsPerDonor || 0).toFixed(1),
                    5.8,
                    Activity
                  )}
                  {renderMetricCard(
                    "Conversion Rate",
                    `${(performance?.conversionRate || 0).toFixed(1)}%`,
                    1.9,
                    Target
                  )}
                </div>

                {/* User Growth Chart */}
                <Card>
                  <CardHeader className={isMobile ? "p-4" : ""}>
                    <CardTitle className={isMobile ? "text-base" : ""}>User Growth</CardTitle>
                    {!isMobile && <CardDescription>New users and active users over time</CardDescription>}
                  </CardHeader>
                  <CardContent className={isMobile ? "p-2" : ""}>
                    {isMobile ? (
                      <MobileChartWrapper height={250}>
                        <LineChart data={userGrowth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ fontSize: 12 }}
                            itemStyle={{ fontSize: 11 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="totalUsers"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Total"
                          />
                          <Line
                            type="monotone"
                            dataKey="newUsers"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="New"
                          />
                        </LineChart>
                      </MobileChartWrapper>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userGrowth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="totalUsers"
                            stroke="#3b82f6"
                            name="Total Users"
                          />
                          <Line
                            type="monotone"
                            dataKey="newUsers"
                            stroke="#10b981"
                            name="New Users"
                          />
                          <Line
                            type="monotone"
                            dataKey="activeDonors"
                            stroke="#f59e0b"
                            name="Active Donors"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div className="space-y-4">
                {/* Campaign Metrics */}
                <div className={cn(
                  "grid gap-3 md:gap-4",
                  isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
                )}>
                  {renderMetricCard(
                    "Active Campaigns",
                    overview?.activeCampaigns || 0,
                    8.3,
                    Target
                  )}
                  {renderMetricCard(
                    "Success Rate",
                    `${(campaignSuccess?.overallSuccessRate || 0).toFixed(1)}%`,
                    2.7,
                    Award
                  )}
                  {renderMetricCard(
                    "Avg Time to Goal",
                    `${campaignSuccess?.avgTimeToGoal || 0}d`,
                    -5.2,
                    Clock,
                    'down'
                  )}
                  {renderMetricCard(
                    "Avg Completion",
                    `${(campaignSuccess?.avgCompletionPercentage || 0).toFixed(1)}%`,
                    4.1,
                    Activity
                  )}
                </div>

                {/* Category Performance */}
                <Card>
                  <CardHeader className={isMobile ? "p-4" : ""}>
                    <CardTitle className={isMobile ? "text-base" : ""}>Category Performance</CardTitle>
                    {!isMobile && <CardDescription>Campaign metrics by category</CardDescription>}
                  </CardHeader>
                  <CardContent className={isMobile ? "p-2" : ""}>
                    <div className={cn(
                      "overflow-x-auto",
                      isMobile && "-mx-2"
                    )}>
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b">
                            <th className={cn(
                              "text-left",
                              isMobile ? "p-2 text-xs" : "p-2"
                            )}>Category</th>
                            <th className={cn(
                              "text-right",
                              isMobile ? "p-2 text-xs" : "p-2"
                            )}>Campaigns</th>
                            <th className={cn(
                              "text-right",
                              isMobile ? "p-2 text-xs" : "p-2"
                            )}>Raised</th>
                            <th className={cn(
                              "text-right",
                              isMobile ? "p-2 text-xs" : "p-2"
                            )}>Success</th>
                            <th className={cn(
                              "text-right",
                              isMobile ? "p-2 text-xs hidden" : "p-2"
                            )}>Avg Goal</th>
                            <th className={cn(
                              "text-right",
                              isMobile ? "p-2 text-xs hidden" : "p-2"
                            )}>Avg Donation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(categories || []).map((cat) => (
                            <tr key={cat.category} className="border-b">
                              <td className={cn(
                                "capitalize",
                                isMobile ? "p-2 text-xs" : "p-2"
                              )}>{cat.category}</td>
                              <td className={cn(
                                "text-right",
                                isMobile ? "p-2 text-xs" : "p-2"
                              )}>{cat.count}</td>
                              <td className={cn(
                                "text-right",
                                isMobile ? "p-2 text-xs" : "p-2"
                              )}>£{(cat.totalRaised / 1000).toFixed(0)}k</td>
                              <td className={cn(
                                "text-right",
                                isMobile ? "p-2 text-xs" : "p-2"
                              )}>{cat.successRate.toFixed(0)}%</td>
                              <td className={cn(
                                "text-right",
                                isMobile ? "p-2 text-xs hidden" : "p-2"
                              )}>£{cat.avgGoal.toFixed(0)}</td>
                              <td className={cn(
                                "text-right",
                                isMobile ? "p-2 text-xs hidden" : "p-2"
                              )}>£{cat.avgDonation.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <div className="space-y-4">
                {/* Financial Metrics */}
                <div className={cn(
                  "grid gap-3 md:gap-4",
                  isMobile ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
                )}>
                  {renderMetricCard(
                    "Total Revenue",
                    `£${(revenue?.totalRevenue || 0).toFixed(0)}`,
                    revenue?.revenueGrowth,
                    DollarSign
                  )}
                  {renderMetricCard(
                    "Total Fees",
                    `£${(revenue?.totalFees || 0).toFixed(0)}`,
                    undefined,
                    TrendingDown
                  )}
                  {renderMetricCard(
                    "Avg Transaction",
                    `£${(revenue?.avgTransactionFee || 0).toFixed(0)}`,
                    undefined,
                    Activity
                  )}
                  {renderMetricCard(
                    "Avg Donation",
                    `£${(overview?.avgDonation || 0).toFixed(0)}`,
                    6.2,
                    DollarSign
                  )}
                </div>

                {/* Monthly Revenue Chart */}
                <Card>
                  <CardHeader className={isMobile ? "p-4" : ""}>
                    <CardTitle className={isMobile ? "text-base" : ""}>Monthly Revenue</CardTitle>
                    {!isMobile && <CardDescription>Platform revenue breakdown</CardDescription>}
                  </CardHeader>
                  <CardContent className={isMobile ? "p-2" : ""}>
                    {isMobile ? (
                      <MobileChartWrapper height={250}>
                        <BarChart data={revenue?.monthlyRevenue || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            formatter={(value) => `£${value.toFixed(0)}`}
                            contentStyle={{ fontSize: 12 }}
                            itemStyle={{ fontSize: 11 }}
                          />
                          <Bar dataKey="gross" fill="#3b82f6" name="Gross" />
                          <Bar dataKey="netRevenue" fill="#10b981" name="Net" />
                        </BarChart>
                      </MobileChartWrapper>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenue?.monthlyRevenue || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="gross" fill="#3b82f6" name="Gross Revenue" />
                          <Bar dataKey="platformFees" fill="#f59e0b" name="Platform Fees" />
                          <Bar dataKey="processorFees" fill="#ef4444" name="Processor Fees" />
                          <Bar dataKey="netRevenue" fill="#10b981" name="Net Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <Card>
                <CardHeader className={isMobile ? "p-4" : ""}>
                  <CardTitle className={isMobile ? "text-base" : ""}>Generate Reports</CardTitle>
                  {!isMobile && <CardDescription>Export platform analytics data</CardDescription>}
                </CardHeader>
                <CardContent className={cn(
                  "space-y-4",
                  isMobile ? "p-4" : ""
                )}>
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "md:grid-cols-2"
                  )}>
                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-medium",
                        isMobile && "text-sm"
                      )}>Platform Overview Report</h3>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        Comprehensive platform metrics including campaigns, users, and donations
                      </p>
                      <Button
                        onClick={() => handleExportReport('overview')}
                        disabled={exportLoading}
                        size={isMobile ? "sm" : "default"}
                        className="w-full md:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Overview
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-medium",
                        isMobile && "text-sm"
                      )}>Donor Behavior Report</h3>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        Detailed analysis of donor patterns and behavior
                      </p>
                      <Button
                        onClick={() => handleExportReport('donor_behavior')}
                        disabled={exportLoading}
                        size={isMobile ? "sm" : "default"}
                        className="w-full md:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Donor Analysis
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-medium",
                        isMobile && "text-sm"
                      )}>Financial Report</h3>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        Revenue, fees, and financial performance metrics
                      </p>
                      <Button
                        onClick={() => handleExportReport('revenue')}
                        disabled={exportLoading}
                        size={isMobile ? "sm" : "default"}
                        className="w-full md:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Financial Data
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-medium",
                        isMobile && "text-sm"
                      )}>Campaign Performance Report</h3>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        Success rates, completion metrics, and category analysis
                      </p>
                      <Button
                        onClick={() => handleExportReport('campaign_performance')}
                        disabled={exportLoading}
                        size={isMobile ? "sm" : "default"}
                        className="w-full md:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Campaign Data
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className={cn(
                      "font-medium mb-2",
                      isMobile && "text-sm"
                    )}>Custom Date Range</h3>
                    <p className={cn(
                      "text-muted-foreground",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      All reports will use the selected date range: {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlatformAnalyticsDashboard;