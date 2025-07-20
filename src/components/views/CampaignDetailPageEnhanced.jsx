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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import CampaignBudgetBreakdown from '@/components/campaigns/CampaignBudgetBreakdown';
import CampaignUpdates from '@/components/campaigns/CampaignUpdates';
import CampaignDonateCard from '@/components/campaigns/CampaignDonateCard';
import TrustScoreBadge from '@/components/profile/TrustScoreBadge';
import { campaignService } from '@/lib/campaignService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { 
  ArrowLeft, Edit, Share2, Flag, MapPin, Globe, BookOpen, 
  Heart, MessageSquare, Users, Target, AlertCircle, Calendar,
  TrendingUp, Eye, Share, HeartHandshake, Clock, CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const CampaignDetailPage = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [campaign, setCampaign] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [isFavorited, setIsFavorited] = useState(false);
  const [showDonateSheet, setShowDonateSheet] = useState(false);

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
          setUpdates([]);
        }

        // Load campaign comments
        try {
          const commentsData = await campaignService.getCampaignComments(campaignId);
          setComments(commentsData.comments || []);
        } catch (err) {
          console.error('Error loading comments:', err);
          setComments([]);
        }

        // Check if favorited
        if (user) {
          try {
            const favorited = await campaignService.checkFavorited(campaignId);
            setIsFavorited(favorited);
          } catch (err) {
            console.error('Error checking favorite status:', err);
          }
        }

        // Increment view count
        await campaignService.incrementViewCount(campaignId);
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
  }, [campaignId, user]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: campaign.title,
        text: campaign.subtitle || campaign.story_summary || 'Support this campaign on Blessed-Horizon',
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Campaign link copied to clipboard!');
    }
    
    // Increment share count
    campaignService.incrementShareCount(campaignId).catch(console.error);
  };

  const handleReport = () => {
    toast.info('Report functionality coming soon');
  };

  const handleEdit = () => {
    navigate(`/campaigns/${campaignId}/edit`);
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Please login to favorite campaigns');
      return;
    }

    try {
      if (isFavorited) {
        await campaignService.unfavoriteCampaign(campaignId);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await campaignService.favoriteCampaign(campaignId);
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorite status');
    }
  };

  if (loading) {
    return <CampaignDetailSkeleton />;
  }

  if (error || !campaign) {
    return (
      <Container className="py-8">
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-2xl font-semibold">Campaign Not Found</h2>
            <p className="text-muted-foreground">{error || 'The campaign you are looking for does not exist.'}</p>
            <Button onClick={() => navigate('/campaigns')}>
              Browse Campaigns
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const isCreator = user && campaign.creator_id === user.id;
  const daysLeft = campaign.deadline ? 
    Math.max(0, Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : 
    null;

  return (
    <Container className="py-4 sm:py-8">
      {/* Back Navigation */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Campaign Media */}
          {campaign.primary_media && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {campaign.primary_media.media_type === 'video' ? (
                <video 
                  controls 
                  className="w-full h-full object-cover"
                  poster={campaign.primary_media.thumbnail_url}
                >
                  <source src={campaign.primary_media.url} type="video/mp4" />
                </video>
              ) : (
                <img 
                  src={campaign.primary_media.url} 
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Mobile Action Buttons Overlay */}
              <div className="absolute top-2 right-2 flex gap-2 lg:hidden">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="bg-white/90 backdrop-blur-sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className={cn(
                    "bg-white/90 backdrop-blur-sm",
                    isFavorited && "text-red-500"
                  )}
                  onClick={handleFavorite}
                >
                  <Heart className={cn("w-4 h-4", isFavorited && "fill-current")} />
                </Button>
              </div>
            </div>
          )}

          {/* Campaign Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {campaign.title}
              </h1>
              {campaign.subtitle && (
                <p className="text-base sm:text-lg text-muted-foreground mt-2">
                  {campaign.subtitle}
                </p>
              )}
            </div>

            {/* Mobile Progress Card */}
            <div className="lg:hidden">
              <CampaignProgress 
                raisedAmount={campaign.raised_amount}
                goalAmount={campaign.goal_amount}
                donorCount={campaign.donor_count}
                daysLeft={daysLeft}
                className="mb-4"
              />
              
              <div className="flex gap-2">
                <Sheet open={showDonateSheet} onOpenChange={setShowDonateSheet}>
                  <SheetTrigger asChild>
                    <Button className="flex-1" size="lg">
                      Donate Now
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Make a Donation</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
                      <CampaignDonateCard campaign={campaign} />
                    </div>
                  </SheetContent>
                </Sheet>
                
                {isCreator && (
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Started {formatDistanceToNow(new Date(campaign.created_at))} ago</span>
              </div>
              {campaign.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{campaign.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{campaign.view_count} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Share className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{campaign.share_count} shares</span>
              </div>
            </div>

            {/* Action Buttons - Desktop Only */}
            <div className="hidden lg:flex gap-4">
              <Button 
                variant="outline" 
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                onClick={handleFavorite}
                className={cn(isFavorited && "text-red-500")}
              >
                <Heart className={cn("w-4 h-4 mr-2", isFavorited && "fill-current")} />
                {isFavorited ? 'Favorited' : 'Favorite'}
              </Button>
              {isCreator && (
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Campaign
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleReport}>
                <Flag className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Campaign Creator Card - Mobile */}
          {campaign.recipient && (
            <Card className="lg:hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={campaign.recipient.avatar_url} />
                      <AvatarFallback>
                        {campaign.recipient.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{campaign.recipient.name}</p>
                      <p className="text-xs text-muted-foreground">Campaign Organizer</p>
                    </div>
                  </div>
                  <TrustScoreBadge
                    score={campaign.recipient.trust_score}
                    tier={campaign.recipient.trust_tier}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="story" className="text-xs sm:text-sm">Story</TabsTrigger>
              <TabsTrigger value="budget" className="text-xs sm:text-sm">Budget</TabsTrigger>
              <TabsTrigger value="updates" className="text-xs sm:text-sm">
                Updates {updates.length > 0 && `(${updates.length})`}
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs sm:text-sm">
                Comments {comments.length > 0 && `(${comments.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="space-y-4 sm:space-y-6">
              {/* Campaign Story */}
              <div className="prose prose-sm sm:prose prose-gray dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{campaign.story_markdown || campaign.story}</p>
              </div>
              
              {campaign.scripture_reference && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-xs sm:text-sm">Scripture Reference</p>
                      <p className="text-xs sm:text-sm mt-1">{campaign.scripture_reference}</p>
                    </div>
                  </div>
                </div>
              )}

              {campaign.prayer_request && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
                      Prayer Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm">{campaign.prayer_request}</p>
                  </CardContent>
                </Card>
              )}

              {/* Expected Outcomes */}
              {campaign.expected_outcomes && campaign.expected_outcomes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                      Expected Outcomes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {campaign.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5" />
                          <span className="text-xs sm:text-sm">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Beneficiaries */}
              {campaign.beneficiaries && campaign.beneficiaries.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      Who We're Helping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                      {campaign.beneficiaries.map((beneficiary, index) => (
                        <div key={index} className="space-y-1">
                          <p className="font-medium text-sm">{beneficiary.name}</p>
                          {beneficiary.age && (
                            <p className="text-xs sm:text-sm text-muted-foreground">Age: {beneficiary.age}</p>
                          )}
                          {beneficiary.relationship && (
                            <p className="text-xs sm:text-sm text-muted-foreground">{beneficiary.relationship}</p>
                          )}
                          {beneficiary.description && (
                            <p className="text-xs sm:text-sm">{beneficiary.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="budget">
              <CampaignBudgetBreakdown campaign={campaign} />
            </TabsContent>

            <TabsContent value="updates">
              <CampaignUpdates updates={updates} />
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Be the first to show support!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Comments would be rendered here */}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          {/* Progress Card */}
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <CampaignProgress 
                raisedAmount={campaign.raised_amount}
                goalAmount={campaign.goal_amount}
                donorCount={campaign.donor_count}
                daysLeft={daysLeft}
              />
              
              <div className="mt-6 space-y-3">
                <CampaignDonateCard campaign={campaign} />
              </div>
            </CardContent>
          </Card>

          {/* Campaign Creator */}
          {campaign.recipient && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={campaign.recipient.avatar_url} />
                      <AvatarFallback>
                        {campaign.recipient.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{campaign.recipient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.recipient.bio || 'Campaign organizer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <TrustScoreBadge
                      score={campaign.recipient.trust_score}
                      tier={campaign.recipient.trust_tier}
                      size="default"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaign.recipient.campaigns_created} campaigns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Donations */}
          {campaign.recent_donations && campaign.recent_donations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Donations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.recent_donations.slice(0, 5).map((donation, index) => (
                    <div key={donation.id || index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {donation.is_anonymous ? '?' : donation.donor_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {donation.is_anonymous ? 'Anonymous' : donation.donor_name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        ${donation.amount}
                      </span>
                    </div>
                  ))}
                </div>
                {campaign.donor_count > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    And {campaign.donor_count - 5} more donors
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Campaign Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="text-sm font-medium">
                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </dd>
                </div>
                {campaign.published_at && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Published</dt>
                    <dd className="text-sm font-medium">
                      {format(new Date(campaign.published_at), 'MMM d, yyyy')}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Updates</dt>
                  <dd className="text-sm font-medium">{updates.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Favorites</dt>
                  <dd className="text-sm font-medium">{campaign.favorite_count}</dd>
                </div>
                {campaign.repeat_donor_rate > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Repeat donors</dt>
                    <dd className="text-sm font-medium">
                      {(campaign.repeat_donor_rate * 100).toFixed(1)}%
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Bottom Stats */}
      <div className="lg:hidden mt-6 space-y-4">
        {/* Recent Donations */}
        {campaign.recent_donations && campaign.recent_donations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                Recent Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaign.recent_donations.slice(0, 3).map((donation, index) => (
                  <div key={donation.id || index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {donation.is_anonymous ? '?' : donation.donor_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {donation.is_anonymous ? 'Anonymous' : donation.donor_name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      ${donation.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Campaign Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updates</dt>
                <dd className="font-medium">{updates.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Favorites</dt>
                <dd className="font-medium">{campaign.favorite_count}</dd>
              </div>
              {campaign.repeat_donor_rate > 0 && (
                <div>
                  <dt className="text-muted-foreground">Repeat donors</dt>
                  <dd className="font-medium">
                    {(campaign.repeat_donor_rate * 100).toFixed(1)}%
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

// Loading skeleton component
const CampaignDetailSkeleton = () => (
  <Container className="py-4 sm:py-8">
    <Skeleton className="h-8 w-32 mb-4" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Skeleton className="aspect-video rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 sm:h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-48 sm:h-64 w-full" />
        <Skeleton className="h-36 sm:h-48 w-full" />
      </div>
      <div className="lg:col-span-1 space-y-4 sm:space-y-6">
        <Skeleton className="h-48 sm:h-64 w-full" />
        <Skeleton className="h-64 sm:h-80 w-full hidden lg:block" />
        <Skeleton className="h-36 sm:h-48 w-full hidden lg:block" />
      </div>
    </div>
  </Container>
);

export default CampaignDetailPage;