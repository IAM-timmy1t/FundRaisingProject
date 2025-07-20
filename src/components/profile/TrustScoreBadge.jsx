import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import TrustScoreModal from './TrustScoreModal';

const TrustScoreBadge = ({ 
  score = 50, 
  tier = 'NEW', 
  size = 'default',
  showTrend = false,
  previousScore = null,
  onClick = null,
  metrics = null,
  userId = null,
  showDetails = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const tierConfig = {
    NEW: {
      label: 'New Member',
      color: 'bg-gray-500',
      borderColor: 'border-gray-500',
      textColor: 'text-gray-700',
      bgGradient: 'from-gray-400 to-gray-600',
      description: 'Just started their journey',
      minScore: 0,
      maxScore: 25
    },
    RISING: {
      label: 'Rising Star',
      color: 'bg-blue-500',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-700',
      bgGradient: 'from-blue-400 to-blue-600',
      description: 'Building trust through actions',
      minScore: 25,
      maxScore: 50
    },
    STEADY: {
      label: 'Steady',
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
      bgGradient: 'from-green-400 to-green-600',
      description: 'Consistent and reliable',
      minScore: 50,
      maxScore: 75
    },
    TRUSTED: {
      label: 'Trusted',
      color: 'bg-purple-500',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-700',
      bgGradient: 'from-purple-400 to-purple-600',
      description: 'Proven track record',
      minScore: 75,
      maxScore: 90
    },
    STAR: {
      label: 'Star',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-700',
      bgGradient: 'from-yellow-400 via-orange-400 to-red-400',
      description: 'Exceptional trust and impact',
      minScore: 90,
      maxScore: 100
    }
  };

  const config = tierConfig[tier] || tierConfig.NEW;
  const formattedScore = score?.toFixed(1) || '50.0';

  const getTrendIcon = () => {
    if (!showTrend || previousScore === null) return null;
    
    const diff = score - previousScore;
    if (diff > 0) return <TrendingUp className="w-3 h-3" />;
    if (diff < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!showTrend || previousScore === null) return '';
    
    const diff = score - previousScore;
    if (diff > 0) return 'text-green-600';
    if (diff < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  const iconSize = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (showDetails && metrics) {
      setShowModal(true);
    }
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        sizeClasses[size],
        config.borderColor,
        'relative flex items-center gap-1.5 font-medium border-2 overflow-hidden',
        (onClick || (showDetails && metrics)) && 'cursor-pointer hover:scale-105 transition-transform',
        isHovered && 'shadow-lg',
        tier === 'STAR' && 'animate-pulse-slow'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient effect */}
      {isHovered && (
        <div className={cn(
          'absolute inset-0 opacity-10 bg-gradient-to-r',
          config.bgGradient
        )} />
      )}
      
      <Shield className={cn(iconSize[size], config.textColor, 'relative z-10')} />
      <span className={cn(config.textColor, 'relative z-10 font-bold')}>{formattedScore}</span>
      {showTrend && (
        <span className={cn(getTrendColor(), 'relative z-10')}>
          {getTrendIcon()}
        </span>
      )}
      {showDetails && metrics && (
        <Info className={cn('w-3 h-3', config.textColor, 'relative z-10 ml-1')} />
      )}
    </Badge>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={cn(config.color, 'text-white')}>
                  {config.label}
                </Badge>
                {tier === 'STAR' && <span className="text-xs">🌟</span>}
              </div>
              <p className="text-sm">{config.description}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium">Trust Score: {formattedScore}/100</p>
                <p>Tier Range: {config.minScore}-{config.maxScore}</p>
                {showTrend && previousScore !== null && (
                  <p className={getTrendColor()}>
                    {score > previousScore ? '↑' : score < previousScore ? '↓' : '→'} 
                    {' '}{Math.abs(score - previousScore).toFixed(1)} points from last week
                  </p>
                )}
              </div>
              {showDetails && metrics && (
                <p className="text-xs font-medium pt-1 border-t">
                  Click to see detailed breakdown →
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showModal && metrics && (
        <TrustScoreModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          score={score}
          tier={tier}
          metrics={metrics}
          userId={userId}
          previousScore={previousScore}
        />
      )}
    </>
  );
};

export default TrustScoreBadge;