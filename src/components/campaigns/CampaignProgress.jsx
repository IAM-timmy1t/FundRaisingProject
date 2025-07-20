import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, TrendingUp, Target } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const CampaignProgress = ({ campaign }) => {
  const {
    goal_amount,
    raised_amount,
    currency,
    donor_count,
    deadline,
    created_at,
    status
  } = campaign;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const progress = goal_amount > 0 ? Math.round((raised_amount / goal_amount) * 100) : 0;
  const daysLeft = deadline
    ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const campaignDuration = created_at && deadline
    ? Math.ceil((new Date(deadline).getTime() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isActive = status === 'FUNDING' && daysLeft > 0;
  const isCompleted = status === 'COMPLETED' || status === 'FUNDED';
  const isCancelled = status === 'CANCELLED';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Campaign Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold">
              {formatCurrency(raised_amount)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatCurrency(goal_amount)} goal
            </span>
          </div>
          
          <Progress value={progress} className="h-3" />
          
          <div className="flex justify-between text-sm">
            <span className="font-medium">{progress}% funded</span>
            {isActive && daysLeft !== null && (
              <span className="text-muted-foreground">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
              </span>
            )}
            {isCompleted && (
              <span className="text-green-600 font-medium">Campaign Completed</span>
            )}
            {isCancelled && (
              <span className="text-destructive font-medium">Campaign Cancelled</span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">Donors</span>
            </div>
            <p className="text-2xl font-semibold">{donor_count || 0}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Avg. Donation</span>
            </div>
            <p className="text-2xl font-semibold">
              {donor_count > 0 ? formatCurrency(raised_amount / donor_count) : formatCurrency(0)}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Started</span>
            </div>
            <p className="text-sm font-medium">
              {created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true }) : 'N/A'}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span className="text-sm">Deadline</span>
            </div>
            <p className="text-sm font-medium">
              {deadline ? format(new Date(deadline), 'MMM d, yyyy') : 'No deadline'}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {campaignDuration && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              Campaign duration: {campaignDuration} days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignProgress;