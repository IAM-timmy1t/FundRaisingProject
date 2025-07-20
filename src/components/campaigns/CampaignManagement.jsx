import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3, FileText, Settings, Users, DollarSign, Eye,
  Edit, Trash2, Play, Pause, CheckCircle, AlertCircle,
  Clock, Target, TrendingUp, Share2, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { format } from 'date-fns';

const CampaignManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (user) {
      fetchUserCampaigns();
    }
  }, [user]);

  const fetchUserCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          donations(amount, status),
          campaign_updates(id),
          campaign_followers(id)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process campaign data
      const processedCampaigns = data.map(campaign => {
        const completedDonations = campaign.donations.filter(d => d.status === 'completed');
        const totalRaised = completedDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        const progressPercentage = (totalRaised / parseFloat(campaign.goal_amount)) * 100;

        return {
          ...campaign,
          totalRaised,
          progressPercentage,
          donorCount: completedDonations.length,
          updateCount: campaign.campaign_updates.length,
          followerCount: campaign.campaign_followers.length
        };
      });

      setCampaigns(processedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { variant: 'secondary', icon: Edit },
      PENDING_REVIEW: { variant: 'warning', icon: Clock },
      FUNDING: { variant: 'success', icon: Play },
      FUNDED: { variant: 'success', icon: CheckCircle },
      COMPLETED: { variant: 'default', icon: CheckCircle },
      PAUSED: { variant: 'warning', icon: Pause },
      REJECTED: { variant: 'destructive', icon: AlertCircle }
    };

    const config = statusConfig[status] || { variant: 'default', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Failed to delete campaign');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    switch (activeTab) {
      case 'active':
        return ['FUNDING', 'PENDING_REVIEW'].includes(campaign.status);
      case 'completed':
        return ['FUNDED', 'COMPLETED'].includes(campaign.status);
      case 'draft':
        return campaign.status === 'DRAFT';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Campaigns</h1>
          <p className="text-muted-foreground">Manage and track your fundraising campaigns</p>
        </div>
        <Button onClick={() => navigate('/campaigns/create')} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No campaigns found</p>
            <Button onClick={() => navigate('/campaigns/create')} variant="outline">
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{campaign.title}</CardTitle>
                    <CardDescription>
                      Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      £{campaign.totalRaised.toFixed(2)} raised
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {campaign.progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(campaign.progressPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Goal: £{parseFloat(campaign.goal_amount).toFixed(2)}
                    </span>
                    {campaign.deadline && (
                      <span className="text-sm text-muted-foreground">
                        Ends {format(new Date(campaign.deadline), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <Users className="w-4 h-4 mr-1" />
                      <span className="text-2xl font-bold">{campaign.donorCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Donors</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="text-2xl font-bold">{campaign.followerCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="text-2xl font-bold">{campaign.updateCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Updates</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="text-2xl font-bold">
                        £{campaign.totalRaised > 0 ? (campaign.totalRaised / campaign.donorCount).toFixed(0) : '0'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg. Donation</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Campaign
                  </Button>
                  
                  {campaign.status === 'FUNDING' && (
                    <>
                      <Button
                        onClick={() => navigate(`/campaigns/${campaign.id}/analytics`)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </Button>
                      <Button
                        onClick={() => navigate(`/campaigns/${campaign.id}/updates`)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Update
                      </Button>
                    </>
                  )}
                  
                  {campaign.status === 'DRAFT' && (
                    <Button
                      onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => navigate(`/campaigns/${campaign.id}/settings`)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  
                  {['DRAFT', 'REJECTED'].includes(campaign.status) && (
                    <Button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Status-specific messages */}
                {campaign.status === 'PENDING_REVIEW' && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your campaign is under review. We'll notify you once it's approved.
                    </AlertDescription>
                  </Alert>
                )}

                {campaign.status === 'REJECTED' && campaign.rejection_reason && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Rejection reason: {campaign.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;
