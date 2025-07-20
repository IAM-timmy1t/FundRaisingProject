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
import { campaignService } from '@/lib/campaignService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { 
  ArrowLeft, Edit, Share2, Flag, MapPin, Globe, BookOpen, 
  Heart, MessageSquare, Users, Target, AlertCircle, Calendar,
  TrendingUp, Eye, Share, HeartHandshake, Clock, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

const CampaignDetailPage = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [isFavorited, setIsFavorited] = useState(false);

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
        await campaignService.removeFavorite(campaignId);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await campaignService.addFavorite(campaignId);
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  const handleComment = async (content, isPrayer = false) => {
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    try {
      const comment = await campaignService.addComment(campaignId, {
        content,
        is_prayer: isPrayer
      });
      setComments([comment, ...comments]);
      toast.success(isPrayer ? 'Prayer posted' : 'Comment posted');
    } catch (err) {
      toast.error('Failed to post comment');
    }
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
  const progressPercentage = (campaign.raised_amount / campaign.goal_amount) * 100;
  const daysLeft = campaign.deadline ? Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = campaign.urgency === 'HIGH' || campaign.urgency === 'CRITICAL';

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
              {isUrgent && (
                <Badge className="absolute top-4 left-4 bg-red-500">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Urgent
                </Badge>
              )}
              {campaign.featured && (
                <Badge className="absolute top-4 right-4 bg-yellow-500">
                  Featured
                </Badge>
              )}
            </div>
          )}

          {/* Title and Meta */}
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold">{campaign.title}</h1>
                  {campaign.subtitle && (
                    <p className="text-lg text-muted-foreground mt-2">{campaign.subtitle}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isOwner && campaign.can_edit && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button 
                    variant={isFavorited ? "default" : "outline"} 
                    size="sm" 
                    onClick={handleFavorite}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                  </Button>
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
                  <Badge variant="outline">{campaign.need_type.replace('_', ' ')}</Badge>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {campaign.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Share className="w-3 h-3" />
                  {campaign.share_count} shares
                </span>
              </div>
            </div>

            {/* Creator Info */}
            {campaign.recipient && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={campaign.recipient.profile_image_url} />
                        <AvatarFallback>
                          {campaign.recipient.display_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="story">Story</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="updates">
                Updates {updates.length > 0 && `(${updates.length})`}
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comments {comments.length > 0 && `(${comments.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="space-y-6">
              {/* Campaign Story */}
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

              {campaign.prayer_request && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5" />
                      Prayer Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{campaign.prayer_request}</p>
                  </CardContent>
                </Card>
              )}

              {/* Expected Outcomes */}
              {campaign.expected_outcomes && campaign.expected_outcomes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Expected Outcomes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {campaign.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Beneficiaries */}
              {campaign.beneficiaries && campaign.beneficiaries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Who We're Helping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {campaign.beneficiaries.map((beneficiary, index) => (
                        <div key={index} className="space-y-1">
                          <p className="font-medium">{beneficiary.name}</p>
                          {beneficiary.age && (
                            <p className="text-sm text-muted-foreground">Age: {beneficiary.age}</p>
                          )}
                          {beneficiary.relationship && (
                            <p className="text-sm text-muted-foreground">{beneficiary.relationship}</p>
                          )}
                          {beneficiary.description && (
                            <p className="text-sm">{beneficiary.description}</p>
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
              {updates.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No updates yet. Check back soon!
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              {user && (
                <Card>
                  <CardContent className="p-4">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      handleComment(formData.get('comment'), formData.get('is_prayer') === 'on');
                      e.target.reset();
                    }}>
                      <textarea
                        name="comment"
                        placeholder="Leave a comment or prayer..."
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={3}
                        required
                      />
                      <div className="flex justify-between items-center mt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="is_prayer" />
                          This is a prayer
                        </label>
                        <Button type="submit" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Post
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {comment.user?.display_name?.charAt(0).toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {comment.is_anonymous ? 'Anonymous' : comment.user?.display_name}
                              </p>
                              {comment.is_prayer && (
                                <Badge variant="secondary" className="text-xs">
                                  Prayer
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No comments yet. Be the first to show support!
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

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
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">
                    ${campaign.raised_amount.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    of ${campaign.goal_amount.toLocaleString()} goal
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {progressPercentage.toFixed(1)}% funded
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold">{campaign.donor_count}</p>
                  <p className="text-sm text-muted-foreground">Donors</p>
                </div>
                <div>
                  {daysLeft !== null ? (
                    <>
                      <p className="text-2xl font-semibold">
                        {daysLeft > 0 ? daysLeft : 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Days left
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No deadline
                      </p>
                    </>
                  )}
                </div>
              </div>

              {campaign.average_donation > 0 && (
                <>
                  <Separator />
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      ${campaign.average_donation.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average donation
                    </p>
                  </div>
                </>
              )}

              {/* Next Update Due */}
              {campaign.next_update_due && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Next update expected{' '}
                      {formatDistanceToNow(new Date(campaign.next_update_due), { addSuffix: true })}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Donate Card */}
          <CampaignDonateCard campaign={campaign} />

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
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </Container>
);

export default CampaignDetailPage;