import { useState, useEffect } from 'react';
import { Trophy, Gift, Users, TrendingUp, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { socialSharingService } from '@/services/socialSharingService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const shareMilestones = [
  { 
    shares: 10, 
    title: 'Campaign Supporter', 
    description: 'Unlock exclusive update from campaign creator',
    icon: Gift,
    reward: 'exclusive_update'
  },
  { 
    shares: 50, 
    title: 'Social Champion', 
    description: 'Get early access to campaign announcements',
    icon: Trophy,
    reward: 'early_access'
  },
  { 
    shares: 100, 
    title: 'Viral Influencer', 
    description: 'Receive special recognition on campaign page',
    icon: Users,
    reward: 'special_recognition'
  },
  { 
    shares: 500, 
    title: 'Campaign Ambassador', 
    description: 'Get personalized thank you from creator',
    icon: TrendingUp,
    reward: 'personalized_thanks'
  }
];

export default function ShareIncentives({ campaign, onUnlock }) {
  const [totalShares, setTotalShares] = useState(0);
  const [userShareCount, setUserShareCount] = useState(0);
  const [unlockedRewards, setUnlockedRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (campaign) {
      loadShareData();
    }
  }, [campaign, user]);

  const loadShareData = async () => {
    try {
      setIsLoading(true);

      // Get total campaign shares
      const stats = await socialSharingService.getShareStats(campaign.id);
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      setTotalShares(total);

      // Get user's share count if logged in
      if (user) {
        const userStats = await getUserShareCount();
        setUserShareCount(userStats);
        
        // Check unlocked rewards
        const unlocked = shareMilestones.filter(m => total >= m.shares).map(m => m.reward);
        setUnlockedRewards(unlocked);
      }
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserShareCount = async () => {
    // This would need a separate query to count user's shares
    // For now, we'll check if they've shared at least once
    const hasShared = await socialSharingService.hasUserShared(campaign.id, user.id);
    return hasShared ? 1 : 0;
  };

  const handleClaimReward = async (milestone) => {
    try {
      // Here you would implement the actual reward claiming logic
      // For now, we'll just show a success message
      toast.success(`🎉 ${milestone.title} reward unlocked!`);
      
      if (onUnlock) {
        onUnlock(milestone);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  const getNextMilestone = () => {
    return shareMilestones.find(m => m.shares > totalShares);
  };

  const getCurrentProgress = () => {
    const nextMilestone = getNextMilestone();
    if (!nextMilestone) return 100;

    const previousMilestone = shareMilestones
      .filter(m => m.shares < nextMilestone.shares)
      .pop();
    
    const previousShares = previousMilestone?.shares || 0;
    const progress = ((totalShares - previousShares) / (nextMilestone.shares - previousShares)) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  const nextMilestone = getNextMilestone();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Share Rewards
        </CardTitle>
        <CardDescription>
          Help spread the word and unlock exclusive rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Total Campaign Shares</span>
            <span className="font-semibold">{totalShares}</span>
          </div>
          {nextMilestone && (
            <>
              <Progress value={getCurrentProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nextMilestone.shares - totalShares} more shares to unlock {nextMilestone.title}
              </p>
            </>
          )}
        </div>

        <Separator />

        {/* User Progress */}
        {user && userShareCount > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium">Your Contribution</p>
            <p className="text-xs text-muted-foreground mt-1">
              You've shared this campaign {userShareCount} time{userShareCount > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Milestones */}
        <div className="space-y-3">
          {shareMilestones.map((milestone, index) => {
            const isUnlocked = totalShares >= milestone.shares;
            const isNext = milestone === nextMilestone;
            const Icon = milestone.icon;

            return (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  isUnlocked 
                    ? 'bg-primary/5 border-primary/20' 
                    : isNext 
                    ? 'border-primary/50' 
                    : 'border-border opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-full',
                    isUnlocked ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{milestone.title}</h4>
                      <Badge variant={isUnlocked ? 'default' : 'outline'} className="text-xs">
                        {milestone.shares} shares
                      </Badge>
                      {isUnlocked && <Unlock className="w-3 h-3 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {milestone.description}
                    </p>
                  </div>
                  {isUnlocked && user && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClaimReward(milestone)}
                      className="text-xs"
                    >
                      Claim
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        {!user && (
          <div className="pt-2">
            <Button variant="outline" className="w-full" asChild>
              <a href="/auth/signin">Sign in to track your rewards</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}