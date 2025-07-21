import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  Calendar, Target, ArrowRight, Plus
} from 'lucide-react';
import analyticsService from '../../services/analyticsService';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// Campaign Analytics Card Component
function CampaignAnalyticsCard({ campaign, loading }) {
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats } = campaign;
  const completionPercentage = stats?.completion_percentage || 0;
  const isActive = campaign.status === 'FUNDING';
  const isCompleted = campaign.status === 'COMPLETED';
  const isFunded = campaign.status === 'FUNDED';

  const getStatusColor = (status) => {
    switch (status) {
      case 'FUNDING': return 'bg-green-100 text-green-800';
      case 'FUNDED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/analytics/${campaign.id}`)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl line-clamp-1">{campaign.title}</CardTitle>
            <CardDescription className="flex items-center mt-2 space-x-2">
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
              {isActive && stats?.days_remaining > 0 && (
                <span className="text-sm text-gray-500">
                  {stats.days_remaining} days left
                </span>
              )}
            </CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="font-medium">{formatCurrency(campaign.raised_amount || 0)}</span>
              <span className="text-gray-500">{completionPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              of {formatCurrency(campaign.goal_amount)} goal
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-semibold">{stats?.unique_donors || 0}</p>
              <p className="text-xs text-gray-500">Donors</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-semibold">{stats?.donation_count || 0}</p>
              <p className="text-xs text-gray-500">Donations</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-semibold">
                {formatCurrency(stats?.daily_average || 0)}
              </p>
              <p className="text-xs text-gray-500">Daily Avg</p>
            </div>
          </div>

          {/* View Analytics Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/analytics/${campaign.id}`);
            }}
          >
            View Full Analytics
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignAnalyticsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const campaignsWithStats = await analyticsService.getRecipientCampaignsWithStats(user.id);
      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
  const totalDonations = campaigns.reduce((sum, c) => sum + (c.stats?.donation_count || 0), 0);
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.stats?.unique_donors || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'FUNDING').length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Campaign Analytics</h1>
        <p className="text-gray-600">Track performance and insights for all your campaigns</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              £{totalRaised.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalDonations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalDonors}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCampaigns}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Campaigns ({campaigns.length})
        </Button>
        <Button
          variant={filter === 'FUNDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('FUNDING')}
        >
          Active ({campaigns.filter(c => c.status === 'FUNDING').length})
        </Button>
        <Button
          variant={filter === 'FUNDED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('FUNDED')}
        >
          Funded ({campaigns.filter(c => c.status === 'FUNDED').length})
        </Button>
        <Button
          variant={filter === 'COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('COMPLETED')}
        >
          Completed ({campaigns.filter(c => c.status === 'COMPLETED').length})
        </Button>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <CampaignAnalyticsCard key={i} loading />
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? "You haven't created any campaigns yet"
                : `You don't have any ${filter.toLowerCase()} campaigns`
              }
            </p>
            {filter === 'all' && (
              <Button onClick={() => navigate('/campaigns/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map(campaign => (
            <CampaignAnalyticsCard 
              key={campaign.id} 
              campaign={campaign}
              loading={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
