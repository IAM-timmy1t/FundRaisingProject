import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  Calendar, Target, ArrowRight, Plus, ChevronRight,
  Eye, Heart, Share2, RefreshCw
} from 'lucide-react';
import analyticsService from '../../services/analyticsService';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// Mobile Campaign Analytics Card Component
function MobileCampaignAnalyticsCard({ campaign, loading, onPress }) {
  if (loading) {
    return (
      <Card className="touch-manipulation active:scale-[0.98] transition-transform">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-2 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats } = campaign;
  const completionPercentage = stats?.completion_percentage || 0;
  const isActive = campaign.status === 'FUNDING';
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'FUNDING': return 'bg-green-100 text-green-800';
      case 'FUNDED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className="touch-manipulation active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => onPress(campaign.id)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-base line-clamp-1">{campaign.title}</h3>
              <Badge className={`${getStatusColor(campaign.status)} text-xs mt-1`}>
                {campaign.status}
              </Badge>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={completionPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${stats?.raised_amount?.toLocaleString() || 0}</span>
              <span>{completionPercentage.toFixed(0)}%</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">{stats?.donor_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Donors</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">{stats?.view_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Views</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <Share2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">{stats?.share_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Shares</p>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Updated {format(new Date(campaign.updated_at), 'MMM d, yyyy')}</span>
            {isActive && <span className="text-green-600 font-medium">Active</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile Analytics Summary Card
function MobileAnalyticsSummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <Card className="touch-manipulation">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const summaryStats = [
    { 
      label: 'Total Raised', 
      value: `$${summary.total_raised?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    { 
      label: 'Total Donors', 
      value: summary.total_donors?.toLocaleString() || 0,
      icon: Users,
      color: 'text-blue-600'
    },
    { 
      label: 'Active Campaigns', 
      value: summary.active_campaigns || 0,
      icon: Target,
      color: 'text-purple-600'
    },
    { 
      label: 'Avg. Donation', 
      value: `$${summary.average_donation?.toFixed(2) || 0}`,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <Card className="touch-manipulation bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold mb-3">Overall Performance</h2>
        <div className="grid grid-cols-2 gap-3">
          {summaryStats.map((stat, index) => (
            <div key={index} className="bg-background rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-base font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CampaignAnalyticsListMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, filter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user's campaigns with analytics
      const campaignsData = await analyticsService.getUserCampaignsWithAnalytics(user.id);
      
      // Filter campaigns based on selected filter
      let filteredCampaigns = campaignsData;
      if (filter === 'active') {
        filteredCampaigns = campaignsData.filter(c => c.status === 'FUNDING');
      } else if (filter === 'completed') {
        filteredCampaigns = campaignsData.filter(c => 
          c.status === 'COMPLETED' || c.status === 'FUNDED'
        );
      }
      
      setCampaigns(filteredCampaigns);
      
      // Calculate summary stats
      const summaryData = {
        total_raised: filteredCampaigns.reduce((sum, c) => 
          sum + (c.stats?.raised_amount || 0), 0
        ),
        total_donors: filteredCampaigns.reduce((sum, c) => 
          sum + (c.stats?.donor_count || 0), 0
        ),
        active_campaigns: filteredCampaigns.filter(c => 
          c.status === 'FUNDING'
        ).length,
        average_donation: filteredCampaigns.reduce((sum, c) => 
          sum + (c.stats?.average_donation || 0), 0
        ) / filteredCampaigns.length || 0
      };
      
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleCampaignPress = (campaignId) => {
    navigate(`/analytics/campaign/${campaignId}`);
  };

  const handleCreateCampaign = () => {
    navigate('/campaigns/create');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Campaign Analytics</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Filter Tabs */}
          <ScrollArea className="w-full -mx-4 px-4">
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="touch-manipulation"
              >
                All
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
                className="touch-manipulation"
              >
                Active
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
                className="touch-manipulation"
              >
                Completed
              </Button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <MobileAnalyticsSummaryCard summary={summary} loading={loading} />

        {/* Campaigns List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your Campaigns</h2>
            <span className="text-sm text-muted-foreground">
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            // Loading skeletons
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <MobileCampaignAnalyticsCard key={i} loading={true} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            // Empty state
            <Card className="touch-manipulation">
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {filter === 'all' 
                    ? "You haven't created any campaigns yet"
                    : `No ${filter} campaigns found`
                  }
                </p>
                {filter === 'all' && (
                  <Button 
                    onClick={handleCreateCampaign}
                    size="sm"
                    className="touch-manipulation"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            // Campaign cards
            campaigns.map((campaign) => (
              <MobileCampaignAnalyticsCard
                key={campaign.id}
                campaign={campaign}
                loading={false}
                onPress={handleCampaignPress}
              />
            ))
          )}
        </div>

        {/* Quick Actions */}
        {campaigns.length > 0 && (
          <div className="pt-4">
            <Button 
              onClick={handleCreateCampaign}
              className="w-full touch-manipulation"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Campaign
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignAnalyticsListMobile;