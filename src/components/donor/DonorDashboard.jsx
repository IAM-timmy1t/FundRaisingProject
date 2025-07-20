import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { donationService } from '@/services/donationService';
import { 
  Heart, 
  TrendingUp, 
  Calendar, 
  Globe, 
  Users, 
  DollarSign,
  FileText,
  Activity,
  Bell,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';
import DonationHistory from './DonationHistory';
import ImpactMetrics from './ImpactMetrics';
import FollowedCampaigns from './FollowedCampaigns';
import RecentUpdates from './RecentUpdates';

const DonorDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [impact, setImpact] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        navigate('/');
        return;
      }
      
      setUser(authUser);

      // Fetch donation statistics and impact data
      const [statsData, impactData] = await Promise.all([
        donationService.getUserDonationStats(authUser.id),
        donationService.getUserImpact(authUser.id)
      ]);

      setStats(statsData);
      setImpact(impactData);
    } catch (error) {
      console.error('Error fetching donor data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: t('donor.totalDonated'),
      value: formatCurrency(stats?.totalAmount || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('donor.campaignsSupported'),
      value: stats?.campaignsSupported || 0,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: t('donor.recipientsHelped'),
      value: impact?.recipientsHelped || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: t('donor.countriesReached'),
      value: impact?.countriesReached || 0,
      icon: Globe,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('donor.dashboardTitle', 'Your Donor Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('donor.dashboardSubtitle', 'Track your donations and see your impact')}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`} />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Updates</span>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Impact Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t('donor.impactSummary', 'Your Impact Summary')}
                      </CardTitle>
                      <CardDescription>
                        {t('donor.impactDescription', 'See how your donations are making a difference')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ImpactMetrics impact={impact} />
                    </CardContent>
                  </Card>

                  {/* Recent Donations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t('donor.recentDonations', 'Recent Donations')}
                      </CardTitle>
                      <CardDescription>
                        {t('donor.recentDonationsDescription', 'Your latest contributions')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DonationHistory userId={user.id} limit={5} compact={true} />
                      <Button 
                        variant="ghost" 
                        className="w-full mt-4"
                        onClick={() => setActiveTab('history')}
                      >
                        View All Donations
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Campaign Updates */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('donor.recentUpdates', 'Recent Campaign Updates')}</CardTitle>
                    <CardDescription>
                      {t('donor.updatesDescription', 'Latest news from campaigns you support')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentUpdates userId={user.id} limit={3} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{t('donor.donationHistory', 'Donation History')}</CardTitle>
                        <CardDescription>
                          {t('donor.historyDescription', 'All your past donations and receipts')}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DonationHistory userId={user.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Campaigns Tab */}
              <TabsContent value="campaigns">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('donor.followedCampaigns', 'Followed Campaigns')}</CardTitle>
                    <CardDescription>
                      {t('donor.campaignsDescription', 'Campaigns you have supported')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FollowedCampaigns userId={user.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Updates Tab */}
              <TabsContent value="updates">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('donor.allUpdates', 'All Campaign Updates')}</CardTitle>
                    <CardDescription>
                      {t('donor.allUpdatesDescription', 'Stay informed about your supported campaigns')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentUpdates userId={user.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
};

export default DonorDashboard;
