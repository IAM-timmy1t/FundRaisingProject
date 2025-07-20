import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellOff,
  Users,
  Heart,
  MessageSquare,
  Eye,
  Sparkles,
  Circle
} from 'lucide-react';

/**
 * Live updates feed with real-time notifications and presence
 */
const LiveUpdatesFeed = ({ campaignId, onUpdateClick }) => {
  const [notifications, setNotifications] = useState(true);
  const [showPresence, setShowPresence] = useState(true);
  
  const {
    updates,
    viewers,
    isConnected,
    newUpdateCount,
    resetNewUpdateCount,
    trackView
  } = useRealtimeUpdates(campaignId, {
    trackPresence: true,
    subscribeToDonations: true,
    onNewUpdate: (update) => {
      // Additional handling for new updates
      console.log('New update in feed:', update);
    },
    onNewDonation: (donation) => {
      // Handle donation notifications
      console.log('New donation:', donation);
    }
  });

  // Auto-reset new update count when feed is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newUpdateCount > 0) {
        resetNewUpdateCount();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [newUpdateCount, resetNewUpdateCount]);

  const handleUpdateClick = async (update) => {
    // Track view
    await trackView(update.id);
    
    // Call parent handler
    if (onUpdateClick) {
      onUpdateClick(update);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Live Updates</CardTitle>
            {isConnected && (
              <Badge variant="outline" className="gap-1">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifications(!notifications)}
              className="h-8 w-8"
            >
              {notifications ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            {newUpdateCount > 0 && (
              <Badge variant="default" className="animate-pulse">
                {newUpdateCount} new
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Viewer presence */}
        {showPresence && viewers.length > 0 && (
          <div className="px-6 py-3 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {viewers.length} {viewers.length === 1 ? 'person' : 'people'} viewing
              </span>
              <div className="flex -space-x-2">
                {viewers.slice(0, 5).map((viewer, index) => (
                  <Avatar key={viewer.user_id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={viewer.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {viewer.user_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {viewers.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    <span className="text-xs">+{viewers.length - 5}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Updates feed */}
        <ScrollArea className="h-[400px]">
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No updates yet. They'll appear here in real-time!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {updates.map((update, index) => (
                <div
                  key={update.id}
                  className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleUpdateClick(update)}
                >
                  {/* New update indicator */}
                  {index < newUpdateCount && (
                    <Badge className="mb-2 animate-pulse" variant="default">
                      New
                    </Badge>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{update.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {update.update_type}
                      </Badge>
                    </div>
                    
                    {update.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {update.content}
                      </p>
                    )}
                    
                    {/* Interaction stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {update.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {update.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {update.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveUpdatesFeed;