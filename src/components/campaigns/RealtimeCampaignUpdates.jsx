import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, FileText, Image, Video, Receipt, Heart, MessageCircle, 
  Eye, Bell, BellOff, Send, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { realtimeService } from '@/services/realtimeService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const RealtimeCampaignUpdates = ({ 
  campaignId, 
  initialUpdates = [], 
  recipientId,
  onUpdateAdded 
}) => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState(initialUpdates);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [userReactions, setUserReactions] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [loadingReactions, setLoadingReactions] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const scrollAreaRef = useRef(null);
  const isOwner = user?.id === recipientId;

  // Subscribe to real-time updates
  useEffect(() => {
    if (!campaignId || !isSubscribed) return;

    // Subscribe to campaign updates
    const updateChannel = realtimeService.subscribeToCampaignUpdates(campaignId, {
      onNewUpdate: (newUpdate) => {
        setUpdates(prev => {
          // Check if update already exists
          if (prev.find(u => u.id === newUpdate.id)) return prev;
          
          // Add new update at the beginning
          const updated = [newUpdate, ...prev];
          
          // Auto-scroll to new update if user is at top
          if (scrollAreaRef.current) {
            const scrollTop = scrollAreaRef.current.scrollTop;
            if (scrollTop < 100) {
              setTimeout(() => {
                scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
            }
          }
          
          return updated;
        });
        
        // Notify parent component
        if (onUpdateAdded) onUpdateAdded(newUpdate);
      },
      onUpdateModified: (modifiedUpdate) => {
        setUpdates(prev => 
          prev.map(update => 
            update.id === modifiedUpdate.id ? modifiedUpdate : update
          )
        );
      }
    });

    // Subscribe to each update's interactions if user is authenticated
    if (user) {
      updates.forEach(update => {
        if (update.id) {
          realtimeService.subscribeToUpdateInteractions(update.id, {
            onReactionChange: (payload) => {
              // Refresh update to get new reaction counts
              refreshUpdate(update.id);
            },
            onNewComment: (comment) => {
              // Refresh update to get new comment count
              refreshUpdate(update.id);
            }
          });
        }
      });

      // Load user's reactions
      loadUserReactions();
    }

    // Track initial views
    updates.forEach(update => {
      if (update.id && user) {
        realtimeService.trackUpdateView(update.id, user.id);
      }
    });

    return () => {
      // Cleanup subscriptions
      realtimeService.unsubscribe(`campaign:${campaignId}:updates`);
      updates.forEach(update => {
        if (update.id) {
          realtimeService.unsubscribe(`update:${update.id}:interactions`);
        }
      });
    };
  }, [campaignId, updates.length, user, isSubscribed]);

  // Load user's reactions for all updates
  const loadUserReactions = async () => {
    if (!user) return;

    try {
      const reactions = {};
      for (const update of updates) {
        if (update.id) {
          const { data, error } = await supabase
            .rpc('get_user_update_reactions', {
              p_update_id: update.id,
              p_user_id: user.id
            });
          
          if (!error && data) {
            reactions[update.id] = data;
          }
        }
      }
      setUserReactions(reactions);
    } catch (error) {
      console.error('Error loading user reactions:', error);
    }
  };

  // Refresh a specific update
  const refreshUpdate = async (updateId) => {
    try {
      const { data, error } = await supabase
        .from('campaign_updates')
        .select('*')
        .eq('id', updateId)
        .single();

      if (!error && data) {
        setUpdates(prev => 
          prev.map(update => 
            update.id === updateId ? data : update
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing update:', error);
    }
  };

  // Toggle reaction
  const toggleReaction = async (updateId, reactionType) => {
    if (!user) {
      toast.error('Please sign in to react to updates');
      return;
    }

    setLoadingReactions(prev => ({ ...prev, [`${updateId}-${reactionType}`]: true }));

    try {
      const { data, error } = await supabase
        .rpc('toggle_update_reaction', {
          p_update_id: updateId,
          p_user_id: user.id,
          p_reaction_type: reactionType
        });

      if (error) throw error;

      // Update local state
      setUserReactions(prev => ({
        ...prev,
        [updateId]: {
          ...prev[updateId],
          [`has_${reactionType}d`]: data.reacted
        }
      }));

      // Refresh update to get new counts
      refreshUpdate(updateId);

    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to update reaction');
    } finally {
      setLoadingReactions(prev => ({ ...prev, [`${updateId}-${reactionType}`]: false }));
    }
  };

  // Add comment
  const addComment = async (updateId) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = commentInputs[updateId]?.trim();
    if (!content) return;

    setLoadingComments(prev => ({ ...prev, [updateId]: true }));

    try {
      const { data, error } = await supabase
        .rpc('add_update_comment', {
          p_update_id: updateId,
          p_user_id: user.id,
          p_content: content
        });

      if (error) throw error;

      // Clear input
      setCommentInputs(prev => ({ ...prev, [updateId]: '' }));
      
      // Refresh update
      refreshUpdate(updateId);
      
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoadingComments(prev => ({ ...prev, [updateId]: false }));
    }
  };

  const getUpdateIcon = (type) => {
    const icons = {
      text: <FileText className="w-4 h-4" />,
      photo: <Image className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      receipt: <Receipt className="w-4 h-4" />,
    };
    return icons[type] || icons.text;
  };

  const getUpdateTypeBadge = (type) => {
    const variants = {
      text: 'outline',
      photo: 'secondary',
      video: 'secondary',
      receipt: 'default',
    };
    return (
      <Badge variant={variants[type] || 'outline'} className="text-xs">
        {type}
      </Badge>
    );
  };

  if (!updates || updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Campaign Updates</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSubscribed(!isSubscribed)}
              className="text-muted-foreground"
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-4 h-4 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-1" />
                  Paused
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No updates posted yet</p>
            <p className="text-sm mt-1">
              {isOwner ? 'Post your first update to keep donors informed' : 'Check back later for campaign progress'}
            </p>
            {isSubscribed && (
              <p className="text-xs mt-2 text-primary">
                🔴 Live updates enabled
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            Campaign Updates ({updates.length})
            {isSubscribed && (
              <span className="ml-2 text-xs text-primary font-normal">
                🔴 Live
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSubscribed(!isSubscribed)}
            className="text-muted-foreground"
          >
            {isSubscribed ? (
              <>
                <Bell className="w-4 h-4 mr-1" />
                Live Updates On
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-1" />
                Live Updates Off
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {updates.map((update, index) => (
              <div
                key={update.id || index}
                className={cn(
                  "border rounded-lg p-4 space-y-3 transition-all duration-300",
                  "hover:bg-muted/50",
                  index === 0 && "ring-2 ring-primary/20"
                )}
              >
                {/* Update Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getUpdateIcon(update.update_type)}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{update.title || 'Update'}</span>
                      {getUpdateTypeBadge(update.update_type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(update.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {/* Update Content */}
                <div className="space-y-2">
                  {update.content && (
                    <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                  )}

                  {/* Media Preview */}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {update.media_urls.map((url, idx) => (
                        <div key={idx} className="relative aspect-video bg-muted rounded overflow-hidden">
                          {update.update_type === 'video' ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Update ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => window.open(url, '_blank')}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spend Information */}
                  {update.spend_amount && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Spent: <strong>${update.spend_amount}</strong>
                        {update.spend_category && ` on ${update.spend_category}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Update Footer with Interactions */}
                <div className="pt-2 border-t space-y-2">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {update.donor_reactions?.views || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {update.donor_reactions?.likes || 0} reactions
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {update.donor_reactions?.comments || 0} comments
                    </span>
                  </div>

                  {/* Reaction Buttons */}
                  {user && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={userReactions[update.id]?.has_liked ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleReaction(update.id, 'like')}
                        disabled={loadingReactions[`${update.id}-like`]}
                      >
                        {loadingReactions[`${update.id}-like`] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Heart className={cn(
                            "w-3 h-3",
                            userReactions[update.id]?.has_liked && "fill-current"
                          )} />
                        )}
                        <span className="ml-1">Like</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedComments(prev => ({
                          ...prev,
                          [update.id]: !prev[update.id]
                        }))}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Comment
                      </Button>
                    </div>
                  )}

                  {/* Comment Section */}
                  {expandedComments[update.id] && user && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={commentInputs[update.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({
                            ...prev,
                            [update.id]: e.target.value
                          }))}
                          className="min-h-[60px] text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addComment(update.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => addComment(update.id)}
                          disabled={!commentInputs[update.id]?.trim() || loadingComments[update.id]}
                        >
                          {loadingComments[update.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RealtimeCampaignUpdates;