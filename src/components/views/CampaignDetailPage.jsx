import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import CampaignBudgetBreakdown from '@/components/campaigns/CampaignBudgetBreakdown';
import RealtimeCampaignUpdates from '@/components/campaigns/RealtimeCampaignUpdates';
import CampaignDonateCard from '@/components/campaigns/CampaignDonateCard';
import TrustScoreBadge from '@/components/profile/TrustScoreBadge';
import { campaignService } from '@/lib/campaignService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { realtimeService } from '@/services/realtimeService';
import { ArrowLeft, Edit, Share2, Flag, MapPin, Globe, BookOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CampaignDetailPage = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [donationCount, setDonationCount] = useState(0);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await campaignService.getCampaign({ id: campaignId });
        setCampaign(data);
        
        // Load campaign updates
        try {
          const updatesData = await campaignService.getCampaignUpdates(campaignId);
          setUpdates(updatesData.updates || []);
        } catch (err) {
          console.error('Error loading updates:', err);
          // Continue without updates if they fail to load
          setUpdates([]);
        }
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError(err.message || 'Failed to load campaign');
        toast.error('Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!campaign || !campaignId) return;

    // Join campaign presence if user is authenticated
    let presenceChannel;
    if (user) {
      presenceChannel = realtimeService.joinCampaignPresence(campaignId, {
        id: user.id,
        name: user.user_metadata?.display_name || 'Anonymous',
        avatar_url: user.user_metadata?.avatar_url
      });

      // Add presence listener
      realtimeService.addPresenceListener(campaignId, (currentViewers) => {
        setViewers(currentViewers);
      });
    }

    // Subscribe to donations
    const donationChannel = realtimeService.subscribeToDonations(campaignId, {
      onNewDonation: (donation) => {
        // Update campaign funding progress
        setCampaign(prev => ({
          ...prev,
          current_amount: (prev.current_amount || 0) + donation.amount,
          donation_count: (prev.donation_count || 0) + 1
        }));
        setDonationCount(prev => prev + 1);
      }
    });

    return () => {
      // Cleanup
      if (presenceChannel) {
        realtimeService.leavePresence(`campaign:${campaignId}:presence`);
        realtimeService.removePresenceListener(campaignId, setViewers);
      }
      realtimeService.unsubscribe(`campaign:${campaignId}:donations`);
    };
  }, [campaign, campaignId, user]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: campaign.title,
        text: campaign.story_summary || 'Support this campaign on Blessed-Horizon',
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Campaign link copied to clipboard!');
    }
  };

  const handleReport = () => {
    toast.info('Report functionality coming soon');
  };

  const handleEdit = () => {
    navigate(`/campaigns/${campaignId}/edit`);
  };

  if (loading) {
    return <CampaignDetailSkeleton />;
  }

  if (error || !campaign) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The campaign you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/campaigns')}>
            Browse Campaigns
          </Button>
        </div>
      </Container>
    );
  }

  const isOwner = user && campaign.recipient_id === user.id;
  const primaryMedia = campaign.media?.find(m => m.is_primary) || campaign.media?.[0];

  return (
    <Container className="py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/campaigns')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Campaigns
      </Button>

      {/* Campaign Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Image */}
          {primaryMedia && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={primaryMedia.media_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title and Meta */}
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold">{campaign.title}</h1>
                <div className="flex gap-2">
                  {isOwner && campaign.can_edit && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReport}>
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {campaign.category && (
                  <Badge variant="secondary">{campaign.category.name}</Badge>
                )}
                {campaign.location_city || campaign.location_country ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[campaign.location_city, campaign.location_country].filter(Boolean).join(', ')}
                  </span>
                ) : null}
                {campaign.need_type && (
                  <Badge variant="outline">{campaign.need_type}</Badge>
                )}
                {viewers.length > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <Users className="w-3 h-3" />
                    {viewers.length} viewing now
                  </span>
                )}
              </div>
            </div>

            {/* Creator Info */}
            {campaign.recipient && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Campaign by</p>
                    <p className="font-medium">{campaign.recipient.display_name}</p>
                    {campaign.recipient.country_iso && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {campaign.recipient.country_iso}
                      </p>
                    )}
                  </div>
                </div>
                <TrustScoreBadge
                  score={campaign.recipient.trust_score}
                  tier={campaign.recipient.trust_tier}
                  size="default"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Campaign Story */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Story</h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{campaign.story_markdown || campaign.story}</p>
            </div>
            
            {campaign.scripture_reference && (
              <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Scripture Reference</p>
                    <p className="text-sm mt-1">{campaign.scripture_reference}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Budget Breakdown */}
          <CampaignBudgetBreakdown campaign={campaign} />

          <Separator />

          {/* Campaign Updates */}
          <RealtimeCampaignUpdates 
            campaignId={campaignId}
            initialUpdates={updates}
            recipientId={campaign.recipient_id}
            onUpdateAdded={(newUpdate) => {
              // Update local state when new update is added
              setUpdates(prev => [newUpdate, ...prev]);
            }}
          />

          {/* Tags */}
          {campaign.tags && campaign.tags.length > 0 && (
            <div className="pt-4">
              <div className="flex flex-wrap gap-2">
                {campaign.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Progress Card */}
          <CampaignProgress campaign={campaign} />

          {/* Donate Card */}
          <CampaignDonateCard campaign={campaign} />

          {/* Recent Donations */}
          {campaign.recent_donations && campaign.recent_donations.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Recent Donations</h3>
                {donationCount > 0 && (
                  <Badge variant="default" className="animate-pulse">
                    +{donationCount} new
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {campaign.recent_donations.slice(0, 5).map((donation, index) => (
                  <div key={donation.id || index} className="flex justify-between text-sm">
                    <span className="font-medium">
                      {donation.is_anonymous ? 'Anonymous' : donation.donor_name}
                    </span>
                    <span className="text-muted-foreground">
                      ${donation.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

// Loading skeleton component
const CampaignDetailSkeleton = () => (
  <Container className="py-8">
    <Skeleton className="h-8 w-32 mb-4" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="aspect-video rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  </Container>
);

export default CampaignDetailPage;