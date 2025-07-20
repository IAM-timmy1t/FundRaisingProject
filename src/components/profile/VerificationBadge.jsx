import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const VerificationBadge = ({ 
  status = 'unverified', 
  size = 'default',
  showLabel = true,
  className = '' 
}) => {
  const statusConfig = {
    unverified: {
      label: 'Unverified',
      icon: null,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100',
      description: 'Account not yet verified'
    },
    email_verified: {
      label: 'Email Verified',
      icon: Check,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Email address has been verified'
    },
    kyc_basic: {
      label: 'Basic KYC',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Basic identity verification completed'
    },
    kyc_advanced: {
      label: 'Advanced KYC',
      icon: ShieldCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Advanced identity and address verification completed'
    },
    kyc_full: {
      label: 'Fully Verified',
      icon: Star,
      color: 'text-gold-600',
      bgColor: 'bg-yellow-100',
      description: 'Complete verification with all checks passed'
    }
  };

  const config = statusConfig[status] || statusConfig.unverified;
  const Icon = config.icon;

  const sizeClasses = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  // Don't show badge for unverified users
  if (status === 'unverified' && !showLabel) {
    return null;
  }

  const badgeContent = (
    <div className={cn('flex items-center gap-1', sizeClasses[size], className)}>
      {Icon && <Icon className={cn(iconSizes[size], config.color)} />}
      {showLabel && (
        <span className={config.color}>{config.label}</span>
      )}
    </div>
  );

  if (!showLabel && Icon) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        config.bgColor,
        'border-0',
        sizeClasses[size]
      )}
    >
      {badgeContent}
    </Badge>
  );
};

export default VerificationBadge;