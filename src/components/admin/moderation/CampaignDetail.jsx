import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  Target,
  User,
  FileText,
  MessageSquare,
  Shield,
  TrendingUp,
  ExternalLink,
  Camera,
  MapPin,
  Heart,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const CampaignDetail = ({ campaign, onClose, onDecision }) => {
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [similarCampaigns, setSimilarCampaigns] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const { toast } = useToast();

  const moderation = campaign.campaign_moderation?.[0];
  const score = moderation?.moderation_score || 0;
  const flags = moderation?.flags || [];
  const details = moderation?.details || {};
  const recommendations = moderation?.recommendations || [];

  useEffect(() => {
    // Fetch similar campaigns and user history
    fetchAdditionalData();
  }, [campaign]);

  const fetchAdditionalData = async () => {
    try {
      // Fetch similar campaigns
      const { data: similar } = await supabase
        .from('campaigns')
        .select('*')
        .eq('need_type', campaign.need_type)
        .neq('id', campaign.id)
        .limit(3);
      
      setSimilarCampaigns(similar || []);

      // Fetch user's campaign history
      const { data: history } = await supabase
        .from('campaigns')
        .select('id, title, status, created_at, goal_amount, current_amount')
        .eq('created_by', campaign.created_by)
        .neq('id', campaign.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setUserHistory(history || []);
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const handleDecision = async (decision) => {
    setLoading(true);
    try {
      // Update campaign status
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          status: decision,
          moderated_at: new Date().toISOString(),
          auto_moderation_passed: decision === 'approved'
        })
        .eq('id', campaign.id);

      if (campaignError) throw campaignError;

      // Add manual review record
      const { error: moderationError } = await supabase
        .from('campaign_moderation')
        .insert({
          campaign_id: campaign.id,
          moderation_score: score,
          decision: decision,
          flags: flags,
          details: details,
          recommendations: recommendations,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          review_notes: reviewNotes
        });

      if (moderationError) throw moderationError;

      toast({
        title: 'Success',
        description: `Campaign ${decision} successfully`
      });

      onDecision();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to update campaign status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-black/95 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span>Campaign Review</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-black/20 border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
              Overview
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-white/10">
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/10">
              History
            </TabsTrigger>
            <TabsTrigger value="similar" className="data-[state=active]:bg-white/10">
              Similar Campaigns
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              {/* Campaign Header */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{campaign.title}</CardTitle>
                      <CardDescription className="text-blue-200 mt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {campaign.need_type}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${campaign.goal_amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(campaign.deadline), 'PPP')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {campaign.location || 'Not specified'}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                        {score}/100
                      </div>
                      <p className="text-sm text-gray-400">Moderation Score</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Creator Info */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Creator Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={campaign.user_profiles?.avatar_url} />
                      <AvatarFallback>{campaign.user_profiles?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{campaign.user_profiles?.name}</p>
                      <p className="text-blue-200">{campaign.user_profiles?.email}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
                          <Shield className="h-3 w-3 mr-1" />
                          Trust Score: {campaign.user_profiles?.trust_score || 0}
                        </Badge>
                        <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">
                          <Heart className="h-3 w-3 mr-1" />
                          {userHistory.length} Previous Campaigns
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Story */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Campaign Story
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{campaign.story}</p>
                  </div>
                  {campaign.scripture_reference && (
                    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-sm text-purple-300 italic">
                        "{campaign.scripture_reference}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Budget Breakdown */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Budget Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaign.budget_breakdown ? (
                    <div className="space-y-2">
                      {Object.entries(campaign.budget_breakdown).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-blue-200 capitalize">{category.replace(/_/g, ' ')}</span>
                          <span className="font-mono">${amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <Separator className="my-2 bg-white/10" />
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total</span>
                        <span className="font-mono">${campaign.goal_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">No budget breakdown provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Media */}
              {campaign.media_urls && campaign.media_urls.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Campaign Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {campaign.media_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Campaign media ${index + 1}`}
                          className="rounded-lg w-full h-48 object-cover"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai-analysis" className="space-y-4">
              {/* Flags */}
              {flags.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      Identified Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {flags.map((flag, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                          <span className="text-red-300">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Details */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    AI Analysis Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key}>
                        <h4 className="font-semibold text-blue-200 capitalize mb-1">
                          {key.replace(/_/g, ' ')}
                        </h4>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                        </pre>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-400" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400 mt-0.5" />
                          <span className="text-green-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">User's Campaign History</CardTitle>
                </CardHeader>
                <CardContent>
                  {userHistory.length > 0 ? (
                    <div className="space-y-3">
                      {userHistory.map((historicCampaign) => (
                        <div key={historicCampaign.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{historicCampaign.title}</p>
                              <p className="text-sm text-blue-200">
                                Created {format(new Date(historicCampaign.created_at), 'PPP')}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`${
                                historicCampaign.status === 'approved'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/50'
                                  : historicCampaign.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                              }`}
                            >
                              {historicCampaign.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-400">
                            ${historicCampaign.current_amount || 0} / ${historicCampaign.goal_amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No previous campaigns found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="similar" className="space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Similar Campaigns</CardTitle>
                  <CardDescription className="text-blue-200">
                    Other {campaign.need_type} campaigns for comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {similarCampaigns.length > 0 ? (
                    <div className="space-y-3">
                      {similarCampaigns.map((similar) => (
                        <div key={similar.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{similar.title}</p>
                              <p className="text-sm text-blue-200">
                                ${similar.goal_amount.toLocaleString()} goal
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-white/10"
                              onClick={() => window.open(`/campaigns/${similar.id}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No similar campaigns found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Review Actions */}
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="review-notes" className="text-sm text-blue-200">
              Review Notes (Required for rejection)
            </Label>
            <Textarea
              id="review-notes"
              placeholder="Add notes about your decision..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-2 bg-black/20 border-white/20 text-white min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="bg-white/10 border-white/20 hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDecision('rejected')}
              disabled={loading || !reviewNotes.trim()}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Campaign
            </Button>
            <Button
              onClick={() => handleDecision('approved')}
              disabled={loading}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetail;