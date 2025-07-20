import { useState, useEffect, useCallback } from 'react';
import { realtimeService } from '@/services/realtimeService';
import { useAuth } from '@/contexts/EnhancedAuthContext';

/**
 * Hook to subscribe to real-time campaign updates
 */
export const useRealtimeUpdates = (campaignId, options = {}) => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newUpdateCount, setNewUpdateCount] = useState(0);

  // Handle new update
  const handleNewUpdate = useCallback((update) => {
    setUpdates(prev => [update, ...prev]);
    setNewUpdateCount(prev => prev + 1);
    
    if (options.onNewUpdate) {
      options.onNewUpdate(update);
    }
  }, [options]);

  // Handle update modification
  const handleUpdateModified = useCallback((update) => {
    setUpdates(prev => prev.map(u => 
      u.id === update.id ? update : u
    ));
    
    if (options.onUpdateModified) {
      options.onUpdateModified(update);
    }
  }, [options]);

  // Handle presence changes
  const handlePresenceChange = useCallback((presenceList) => {
    setViewers(presenceList);
    
    if (options.onPresenceChange) {
      options.onPresenceChange(presenceList);
    }
  }, [options]);

  // Reset new update count
  const resetNewUpdateCount = useCallback(() => {
    setNewUpdateCount(0);
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    // Subscribe to updates
    const updateChannel = realtimeService.subscribeToCampaignUpdates(campaignId, {
      onNewUpdate: handleNewUpdate,
      onUpdateModified: handleUpdateModified
    });

    // Join presence if user is authenticated
    let presenceChannel;
    if (user && options.trackPresence !== false) {
      presenceChannel = realtimeService.joinCampaignPresence(campaignId, {
        id: user.id,
        name: user.full_name || user.email,
        avatar_url: user.avatar_url
      });

      // Add presence listener
      realtimeService.addPresenceListener(campaignId, handlePresenceChange);
    }

    // Subscribe to donations if requested
    let donationChannel;
    if (options.subscribeToDonations) {
      donationChannel = realtimeService.subscribeToDonations(campaignId, {
        onNewDonation: options.onNewDonation
      });
    }

    setIsConnected(true);

    // Cleanup
    return () => {
      realtimeService.unsubscribe(`campaign:${campaignId}:updates`);
      
      if (presenceChannel) {
        realtimeService.leavePresence(`campaign:${campaignId}:presence`);
        realtimeService.removePresenceListener(campaignId, handlePresenceChange);
      }
      
      if (donationChannel) {
        realtimeService.unsubscribe(`campaign:${campaignId}:donations`);
      }
      
      setIsConnected(false);
    };
  }, [campaignId, user, handleNewUpdate, handleUpdateModified, handlePresenceChange, options]);

  return {
    updates,
    viewers,
    isConnected,
    newUpdateCount,
    resetNewUpdateCount,
    trackView: (updateId) => realtimeService.trackUpdateView(updateId, user?.id)
  };
};

/**
 * Hook to subscribe to update interactions (likes, comments)
 */
export const useUpdateInteractions = (updateId, initialData = {}) => {
  const [likes, setLikes] = useState(initialData.likes || 0);
  const [comments, setComments] = useState(initialData.comments || []);
  const [hasLiked, setHasLiked] = useState(initialData.hasLiked || false);

  const handleReactionChange = useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      setLikes(prev => prev + 1);
      if (payload.new.user_id === user?.id) {
        setHasLiked(true);
      }
    } else if (payload.eventType === 'DELETE') {
      setLikes(prev => Math.max(0, prev - 1));
      if (payload.old.user_id === user?.id) {
        setHasLiked(false);
      }
    }
  }, []);

  const handleNewComment = useCallback((comment) => {
    setComments(prev => [...prev, comment]);
  }, []);

  useEffect(() => {
    if (!updateId) return;

    const channel = realtimeService.subscribeToUpdateInteractions(updateId, {
      onReactionChange: handleReactionChange,
      onNewComment: handleNewComment
    });

    return () => {
      realtimeService.unsubscribe(`update:${updateId}:interactions`);
    };
  }, [updateId, handleReactionChange, handleNewComment]);

  return {
    likes,
    comments,
    hasLiked,
    setHasLiked,
    setLikes,
    setComments
  };
};