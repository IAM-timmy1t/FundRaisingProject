import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { campaignService } from '@/services/campaignService';
import { userProfileService } from '@/lib/userProfileService';
import { 
  DollarSign,
  Users,
  Target,
  TrendingUp,
  Activity,
  Bell,
  Shield,
  Plus,
  FileText,
  BarChart3,
  Calendar,
  ChevronRight,
  Download,
  MessageSquare,
  Eye,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';
import CampaignOverviewCards from './CampaignOverviewCards';
import TrustScoreInsights from './TrustScoreInsights';
import UpdateReminders from './UpdateReminders';
import RecipientAnalytics from './RecipientAnalytics';
import QuickActions from './QuickActions';
import CampaignMetricsChart from './CampaignMetricsChart';
import { useSwipeable } from 'react-swipeable';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import MobileTabNavigation from '@/components/shared/MobileTabNavigation';

const RecipientDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRaised: 0,
    totalDonors: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    averageDonation: 0,
    trustScore: 0,
    trustTier: 'NEW'
  });
  const [trustScore, setTrustScore] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      await fetchRecipientData();
      setRefreshing(false);
    },
    threshold: 80,
    enabled: isMobile
  });

  // Swipe navigation for tabs
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const tabs = ['overview', 'campaigns', 'trust', 'updates', 'analytics'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const tabs = ['overview', 'campaigns', 'trust', 'updates', 'analytics'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    },
    trackMouse: false
  });

  useEffect(() => {
    fetchRecipientData();
  }, []);

  const fetchRecipientData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        navigate('/');
        return;
      }
      
      setUser(authUser);

      // Fetch user profile with trust score
      const { data: profileData, error: profileError } = await userProfileService.getProfile(authUser.id);
      if (profileData && !profileError) {
        setTrustScore({
          score: profileData.trust_score || 0,
          tier: profileData.trust_tier || 'NEW'
        });
      }

      // Fetch user's campaigns with metrics
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          donations!campaign_id (
            amount,
            donor_id,
            created_at
          )
        `)
        .eq('created_by', authUser.id)
        .order('created_at', { ascending: false });

      if (!campaignsError && campaignsData) {
        // Process campaigns and calculate metrics
        const processedCampaigns = campaignsData.map(campaign => {
          const donations = campaign.donations || [];
          const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
          const uniqueDonors = new Set(donations.map(d => d.donor_id)).size;
          const lastDonation = donations.length > 0 
            ? Math.max(...donations.map(d => new Date(d.created_at)))
            : null;

          return {
            ...campaign,
            current_amount: totalRaised,
            donor_count: uniqueDonors,
            donation_count: donations.length,
            last_donation_date: lastDonation
          };
        });

        setCampaigns(processedCampaigns);

        // Calculate aggregate metrics
        const totalRaised = processedCampaigns.reduce((sum, c) => sum + c.current_amount, 0);
        const totalDonations = processedCampaigns.reduce((sum, c) => sum + c.donation_count, 0);
        const allDonors = new Set();
        processedCampaigns.forEach(c => {
          if (c.donations) {
            c.donations.forEach(d => allDonors.add(d.donor_id));
          }
        });

        setMetrics({
          totalRaised,
          totalDonors: allDonors.size,
          activeCampaigns: processedCampaigns.filter(c => c.status === 'active' || c.status === 'approved').length,
          completedCampaigns: processedCampaigns.filter(c => c.status === 'completed').length,
          averageDonation: totalDonations > 0 ? totalRaised / totalDonations : 0,
          trustScore: profileData?.trust_score || 0,
          trustTier: profileData?.trust_tier || 'NEW'
        });
      }

      // Set up real-time subscriptions
      const subscription = supabase
        .channel('recipient-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `recipient_id=eq.${authUser.id}`
        }, handleRealtimeUpdate)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `created_by=eq.${authUser.id}`
        }, handleRealtimeUpdate)
        .subscribe();

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error fetching recipient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload) => {
    // Refresh data when updates occur
    fetchRecipientData();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 md:h-32" />
            ))}
          </div>
          <Skeleton className="h-64 md:h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: t('recipient.totalRaised'),
      value: formatCurrency(metrics.totalRaised),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12%',
      trend: 'up'
    },
    {
      title: t('recipient.totalDonors'),
      value: metrics.totalDonors,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+8%',
      trend: 'up'
    },
    {
      title: t('recipient.activeCampaigns'),
      value: metrics.activeCampaigns,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: t('recipient.trustScore'),
      value: metrics.trustScore,
      icon: Shield,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      badge: metrics.trustTier
    }
  ];

  const MobileHeader = () => (
    <div className="md:hidden flex justify-between items-center mb-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                navigate('/campaigns/create');
                setShowMobileMenu(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                navigate('/settings');
                setShowMobileMenu(false);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl">
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

      {/* Stats Grid - Optimized for mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow touch-manipulation">
              <CardContent className="p-3 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-gray-600 mb-1">{stat.title}</p>
                    <div className="flex items-center gap-1 md:gap-2">
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{stat.value}</p>
                      {stat.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {stat.badge}
                        </Badge>
                      )}
                    </div>
                    {stat.change && !isMobile && (
                      <p className={`text-xs mt-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change} from last month
                      </p>
                    )}
                  </div>
                  <div className={`p-2 md:p-3 rounded-full ${stat.bgColor} mt-2 md:mt-0`}>
                    <stat.icon className={`h-4 w-4 md:h-6 md:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - Mobile optimized */}
      <div className="mb-6 md:mb-8">
        <QuickActions campaigns={campaigns} isMobile={isMobile} />
      </div>

      {/* Mobile Tab Navigation */}
      {isMobile ? (
        <MobileTabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { value: 'overview', label: 'Overview', icon: Activity },
            { value: 'campaigns', label: 'Campaigns', icon: Target },
            { value: 'trust', label: 'Trust', icon: Shield },
            { value: 'updates', label: 'Updates', icon: Bell },
            { value: 'analytics', label: 'Analytics', icon: BarChart3 }
          ]}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="trust" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Trust Score</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Updates</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Tab Content with swipe support */}
      <div {...swipeHandlers} className="mt-4 md:mt-6">
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
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* Campaign Performance Chart */}
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                        {t('recipient.campaignPerformance', 'Campaign Performance')}
                      </CardTitle>
                      {!isMobile && (
                        <CardDescription>
                          {t('recipient.performanceDescription', 'Track your fundraising progress over time')}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <CampaignMetricsChart campaigns={campaigns} isMobile={isMobile} />
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Activity className="h-4 w-4 md:h-5 md:w-5" />
                        {t('recipient.recentActivity', 'Recent Activity')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <UpdateReminders campaigns={campaigns} compact={true} isMobile={isMobile} />
                    </CardContent>
                  </Card>
                </div>

                {/* Active Campaigns Overview */}
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                      <div>
                        <CardTitle className="text-base md:text-lg">
                          {t('recipient.activeCampaignsOverview', 'Active Campaigns')}
                        </CardTitle>
                        {!isMobile && (
                          <CardDescription>
                            {t('recipient.campaignsDescription', 'Monitor and manage your fundraising campaigns')}
                          </CardDescription>
                        )}
                      </div>
                      <Button 
                        onClick={() => navigate('/campaigns/create')}
                        size={isMobile ? "sm" : "default"}
                        className="w-full md:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    <CampaignOverviewCards 
                      campaigns={campaigns.filter(c => c.status === 'active' || c.status === 'approved').slice(0, 2)} 
                      isMobile={isMobile}
                    />
                    {campaigns.length > 2 && (
                      <Button 
                        variant="ghost" 
                        className="w-full mt-4"
                        onClick={() => setActiveTab('campaigns')}
                      >
                        View All Campaigns
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <div>
                      <CardTitle className="text-base md:text-lg">
                        {t('recipient.allCampaigns', 'All Campaigns')}
                      </CardTitle>
                      {!isMobile && (
                        <CardDescription>
                          {t('recipient.allCampaignsDescription', 'Manage all your fundraising campaigns')}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isMobile && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      )}
                      <Button 
                        onClick={() => navigate('/campaigns/create')}
                        size={isMobile ? "sm" : "default"}
                        className={isMobile ? "flex-1" : ""}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <CampaignOverviewCards campaigns={campaigns} isMobile={isMobile} />
                </CardContent>
              </Card>
            )}

            {/* Trust Score Tab */}
            {activeTab === 'trust' && (
              <TrustScoreInsights 
                userId={user.id}
                currentScore={metrics.trustScore}
                currentTier={metrics.trustTier}
                isMobile={isMobile}
              />
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-base md:text-lg">
                    {t('recipient.updateReminders', 'Update Reminders')}
                  </CardTitle>
                  {!isMobile && (
                    <CardDescription>
                      {t('recipient.remindersDescription', 'Keep your campaigns active with regular updates')}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <UpdateReminders campaigns={campaigns} isMobile={isMobile} />
                </CardContent>
              </Card>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <RecipientAnalytics campaigns={campaigns} isMobile={isMobile} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecipientDashboard;