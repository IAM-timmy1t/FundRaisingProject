import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import CampaignBudgetBreakdown from '@/components/campaigns/CampaignBudgetBreakdown';
import CampaignUpdates from '@/components/campaigns/CampaignUpdates';
import CampaignDonateCard from '@/components/campaigns/CampaignDonateCard';
import TrustScoreBadge from '@/components/profile/TrustScoreBadge';
import LiveUpdatesFeed from '@/components/campaigns/LiveUpdatesFeed';
import UpdateManager from '@/components/campaigns/UpdateManager';
import SocialShareWidget from '@/components/social/SocialShareWidget';
import ShareIncentives from '@/components/social/ShareIncentives';
import CampaignEmbedWidget from '@/components/social/CampaignEmbedWidget';
import { SocialMetaTags } from '@/components/social/SocialPreviewCard';
import { campaignService } from '@/lib/campaignService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Share2,
  Heart,
  MessageSquare,
  MoreVertical,
  MapPin,
  Calendar,
  User,
  Shield,
  Verified,
  AlertTriangle,
  Edit,
  Bell,
  BellOff,
  Users,
  Circle
} from 'lucide-react';

/**
 * Enhanced Campaign Detail Page with Real-time Updates
 */
const CampaignDetailPageRealtime = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showUpdateManager, setShowUpdateManager] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Real-time updates hook
  const {
    viewers,
    isConnected,
    newUpdateCount
  } = useRealtimeUpdates(id, {
    trackPresence: true,
    subscribeToDonations: true,
    onNewDonation: (donation) => {
      // Update campaign raised amount in real-time
      setCampaign(prev => ({
        ...prev,
        raised_amount: (prev?.raised_amount || 0) + donation.amount,
        donation_count: (prev?.donation_count || 0) + 1
      }));
    },
    onNewUpdate: (update) => {
      // Show notification for new updates if enabled
      if (notificationsEnabled && !isOwner) {
        toast.info('New Update', {
          description: `${campaign?.title} posted: ${update.title}`,
          action: {
            label: 'View',
            onClick: () => {
              const updatesTab = document.querySelector('[value="updates"]');
              updatesTab?.click();
            }
          }
        });
      }
    }
  });

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  useEffect(() => {
    if (campaign && user) {
      setIsOwner(campaign.creator_id === user.id);
    }
  }, [campaign, user]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const data = await campaignService.getCampaignById(id);
      setCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: campaign.description,
          url: url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Container>
    );
  }

  if (!campaign) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The campaign you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/campaigns')}>Browse Campaigns</Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const progress = (campaign.raised_amount / campaign.goal_amount) * 100;
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <>
      {/* Social Meta Tags for SEO */}
      <SocialMetaTags campaign={campaign} />
      
      <Container className="py-8">
        <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header with real-time indicators */}
          <div className="relative">
            {/* Live indicator */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {isConnected && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <Circle className="h-2 w-2 fill-white" />
                  Live
                </Badge>
              )}
              {viewers.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {viewers.length} viewing
                </Badge>
              )}
            </div>

            {/* Campaign Image */}
            {campaign.image_url && (
              <div className="relative h-96 rounded-lg overflow-hidden mb-6">
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
                {campaign.is_featured && (
                  <Badge className="absolute top-4 left-4" variant="default">
                    Featured Campaign
                  </Badge>
                )}
              </div>
            )}

            {/* Campaign Title and Meta */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {campaign.location || 'Global'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {daysLeft} days left
                  </span>
                  <Badge variant="outline">{campaign.category}</Badge>
                  {campaign.status === 'active' && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              </div>

              {/* Creator Info with Trust Score */}
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={campaign.creator?.avatar_url} />
                      <AvatarFallback>
                        {campaign.creator?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {campaign.creator?.full_name || 'Anonymous'}
                        {campaign.creator?.is_verified && (
                          <Verified className="h-4 w-4 text-primary" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Fundraiser organizer
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrustScoreBadge score={campaign.creator?.trust_score || 0} />
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUpdateManager(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Post Update
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                >
                  {notificationsEnabled ? (
                    <>
                      <Bell className="h-4 w-4 mr-1" />
                      Notifications On
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-1" />
                      Notifications Off
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="about" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="updates" className="relative">
                Updates
                {newUpdateCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {newUpdateCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="donors">Donors</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{campaign.description}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="updates" id="campaign-updates">
              <CampaignUpdates campaignId={campaign.id} isOwner={isOwner} />
            </TabsContent>

            <TabsContent value="budget">
              <CampaignBudgetBreakdown budget={campaign.budget_breakdown} />
            </TabsContent>

            <TabsContent value="donors">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Donors</CardTitle>
                  <CardDescription>
                    {campaign.donation_count || 0} people have donated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Donor list would go here */}
                  <p className="text-muted-foreground text-center py-8">
                    Donor list coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardContent className="p-6">
              <CampaignProgress
                raised={campaign.raised_amount}
                goal={campaign.goal_amount}
                percentage={progress}
                donorCount={campaign.donation_count || 0}
              />
            </CardContent>
          </Card>

          {/* Donate Card */}
          <CampaignDonateCard campaign={campaign} />

          {/* Social Sharing */}
          <SocialShareWidget campaign={campaign} />

          {/* Share Incentives */}
          <ShareIncentives campaign={campaign} />

          {/* Embed Widget - Only for campaign owner */}
          {isOwner && (
            <CampaignEmbedWidget campaign={campaign} />
          )}

          {/* Live Updates Feed */}
          <LiveUpdatesFeed
            campaignId={campaign.id}
            onUpdateClick={(update) => {
              // Switch to updates tab
              const updatesTab = document.querySelector('[value="updates"]');
              updatesTab?.click();
            }}
          />
        </div>
      </div>

      {/* Update Manager Modal */}
      {showUpdateManager && (
        <UpdateManager
          campaignId={campaign.id}
          onClose={() => setShowUpdateManager(false)}
          onUpdatePosted={() => {
            setShowUpdateManager(false);
            // Updates will appear automatically via real-time subscription
          }}
        />
      )}
    </Container>
  );
};

export default CampaignDetailPageRealtime;