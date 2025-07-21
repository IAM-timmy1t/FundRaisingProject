import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  TrendingUp,
  Award,
  Star,
  Info,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

/**
 * Mobile-optimized trust score visualization
 * Features:
 * - Touch-friendly interactions
 * - Animated progress indicators
 * - Swipeable tier cards
 * - Compact layout for mobile screens
 */

const trustTiers = [
  {
    name: 'NEW',
    minScore: 0,
    maxScore: 99,
    color: 'bg-gray-500',
    icon: Shield,
    benefits: ['Basic features', 'Standard verification'],
    locked: false
  },
  {
    name: 'BRONZE',
    minScore: 100,
    maxScore: 299,
    color: 'bg-orange-600',
    icon: Shield,
    benefits: ['Priority support', 'Badge display', 'Higher visibility'],
    locked: true
  },
  {
    name: 'SILVER',
    minScore: 300,
    maxScore: 599,
    color: 'bg-gray-400',
    icon: Award,
    benefits: ['Featured campaigns', 'Advanced analytics', 'Instant payouts'],
    locked: true
  },
  {
    name: 'GOLD',
    minScore: 600,
    maxScore: 999,
    color: 'bg-yellow-500',
    icon: Star,
    benefits: ['Premium placement', 'Dedicated support', 'Custom branding'],
    locked: true
  },
  {
    name: 'PLATINUM',
    minScore: 1000,
    maxScore: Infinity,
    color: 'bg-purple-600',
    icon: Star,
    benefits: ['VIP features', 'Personal advisor', 'Zero fees'],
    locked: true
  }
];

const MobileTrustScoreVisualization = ({
  currentScore = 0,
  currentTier = 'NEW',
  recentActivities = [],
  onLearnMore,
  className = ''
}) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const progressRef = useRef(null);
  
  // Find current tier info
  const currentTierInfo = trustTiers.find(tier => tier.name === currentTier) || trustTiers[0];
  const nextTier = trustTiers.find(tier => tier.minScore > currentScore);
  const progressToNextTier = nextTier
    ? ((currentScore - currentTierInfo.minScore) / (nextTier.minScore - currentTierInfo.minScore)) * 100
    : 100;

  // Score ring component
  const ScoreRing = ({ score, size = 120 }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 1000) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={cn(
              currentTierInfo.color.replace('bg-', 'text-')
            )}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isVisible ? { strokeDashoffset } : {}}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={isVisible ? { scale: 1 } : {}}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-center"
          >
            <div className="text-2xl font-bold">{score}</div>
            <div className="text-xs text-muted-foreground">Trust Score</div>
          </motion.div>
        </div>
      </div>
    );
  };

  // Tier card component
  const TierCard = ({ tier, isActive, isUnlocked, index }) => {
    const Icon = tier.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: index * 0.1 }}
        className="relative"
      >
        <Card className={cn(
          "relative overflow-hidden transition-all",
          isActive && "ring-2 ring-primary",
          !isUnlocked && "opacity-60"
        )}>
          {isActive && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
              Current
            </div>
          )}
          
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-full",
                tier.color,
                "text-white"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{tier.name}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {tier.minScore}+ pts
                  </Badge>
                  {!isUnlocked && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                
                <ul className="text-xs text-muted-foreground space-y-1">
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Activity item component
  const ActivityItem = ({ activity, index }) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'campaign_created': return Plus;
        case 'donation_received': return Heart;
        case 'update_posted': return MessageSquare;
        case 'verification_completed': return CheckCircle;
        default: return Activity;
      }
    };
    
    const Icon = getIcon();
    const points = activity.points > 0 ? `+${activity.points}` : activity.points;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isVisible ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
      >
        <div className={cn(
          "p-2 rounded-full",
          activity.points > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">{activity.title}</p>
          <p className="text-xs text-muted-foreground">{activity.date}</p>
        </div>
        
        <Badge variant={activity.points > 0 ? "default" : "destructive"}>
          {points}
        </Badge>
      </motion.div>
    );
  };

  return (
    <div ref={ref} className={cn("space-y-4", className)}>
      {/* Score Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Ring and Info */}
          <div className="flex items-center gap-4">
            <ScoreRing score={currentScore} size={100} />
            
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn(
                    currentTierInfo.color,
                    "text-white"
                  )}>
                    {currentTier} TIER
                  </Badge>
                  {nextTier && (
                    <span className="text-xs text-muted-foreground">
                      Next: {nextTier.name}
                    </span>
                  )}
                </div>
                
                {nextTier && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress to {nextTier.name}</span>
                      <span>{currentScore}/{nextTier.minScore}</span>
                    </div>
                    <Progress value={progressToNextTier} className="h-2" />
                  </div>
                )}
              </div>
              
              <button
                onClick={onLearnMore}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                How to increase score
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold">12</p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">98%</p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">4.8</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tier Progression */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tier Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trustTiers.map((tier, index) => (
              <TierCard
                key={tier.name}
                tier={tier}
                isActive={tier.name === currentTier}
                isUnlocked={tier.minScore <= currentScore}
                index={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.slice(0, 5).map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  index={index}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Import missing icons
import { Plus, Heart, MessageSquare, CheckCircle, Activity } from 'lucide-react';

export default MobileTrustScoreVisualization;