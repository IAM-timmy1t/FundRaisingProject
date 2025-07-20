import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import TrustScoreBadge from '@/components/profile/TrustScoreBadge';
import { Calendar, MapPin, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CampaignCard = ({ campaign, onClick }) => {
  const {
    id,
    title,
    slug,
    need_type,
    goal_amount,
    raised_amount,
    currency,
    deadline,
    status,
    donor_count,
    location_city,
    location_country,
    progress,
    days_left,
    primary_media_url,
    primary_media_thumbnail,
    category,
    recipient
  } = campaign;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = () => {
    const statusConfig = {
      FUNDING: { label: 'Active', variant: 'default' },
      FUNDED: { label: 'Funded', variant: 'secondary' },
      COMPLETED: { label: 'Completed', variant: 'outline' },
      CANCELLED: { label: 'Cancelled', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = () => {
    if (!days_left || days_left > 7) return null;
    
    if (days_left <= 1) {
      return <Badge variant="destructive">Last Day!</Badge>;
    } else if (days_left <= 3) {
      return <Badge variant="destructive">{days_left} days left</Badge>;
    } else {
      return <Badge variant="secondary">{days_left} days left</Badge>;
    }
  };

  return (
    <Card 
      className="h-full cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden"
      onClick={() => onClick?.(campaign)}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {primary_media_url ? (
          <img
            src={primary_media_thumbnail || primary_media_url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Target className="w-12 h-12" />
          </div>
        )}
        
        {/* Status badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {getStatusBadge()}
          {getUrgencyBadge()}
        </div>

        {/* Category badge */}
        {category && (
          <Badge 
            variant="secondary" 
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm"
          >
            {category.name}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2">
          {title}
        </h3>

        {/* Location */}
        {(location_city || location_country) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{[location_city, location_country].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold">
              {formatCurrency(raised_amount)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatCurrency(goal_amount)}
            </span>
          </div>
          <Progress value={progress || 0} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress || 0}% funded</span>
            {donor_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {donor_count} donors
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        {/* Creator info */}
        {recipient && (
          <div className="flex items-center gap-2">
            <div className="text-sm">
              <p className="font-medium">{recipient.display_name}</p>
            </div>
            <TrustScoreBadge
              score={recipient.trust_score}
              tier={recipient.trust_tier}
              size="small"
            />
          </div>
        )}

        {/* Deadline */}
        {deadline && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(deadline), 'MMM d, yyyy')}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default CampaignCard;