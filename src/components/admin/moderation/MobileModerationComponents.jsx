import React from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target,
  DollarSign,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * MobileCampaignCard Component
 * Mobile-optimized campaign card for moderation queue
 */
export const MobileCampaignCard = ({ 
  campaign, 
  isSelected, 
  onSelect, 
  onReview, 
  onQuickApprove, 
  onQuickReject 
}) => {
  const moderation = campaign.campaign_moderation?.[0];
  const score = moderation?.moderation_score || 0;
  const flags = moderation?.flags || [];

  const getScoreBadge = (score) => {
    if (score >= 70) return { color: 'bg-green-500/20 text-green-300 border-green-500/50', label: 'Low Risk' };
    if (score >= 40) return { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', label: 'Medium Risk' };
    return { color: 'bg-red-500/20 text-red-300 border-red-500/50', label: 'High Risk' };
  };

  const scoreBadge = getScoreBadge(score);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200",
        "bg-white/5 border-white/10",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with checkbox and score */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="h-5 w-5 mt-0.5 rounded border-gray-300"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-white line-clamp-2">
                {campaign.title}
              </h3>
            </div>
          </div>
          <Badge className={cn("whitespace-nowrap", scoreBadge.color)}>
            {score}/100
          </Badge>
        </div>

        {/* Campaign info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-blue-200">
            <Target className="h-3 w-3" />
            <span className="truncate">{campaign.need_type}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-200">
            <DollarSign className="h-3 w-3" />
            <span>${campaign.goal_amount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-200">
            <Calendar className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-200">
            <Shield className="h-3 w-3" />
            <span>Trust: {campaign.user_profiles?.trust_score || 0}</span>
          </div>
        </div>

        {/* Creator info */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
            {campaign.user_profiles?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {campaign.user_profiles?.name}
            </p>
            <p className="text-xs text-blue-200 truncate">
              {campaign.user_profiles?.email}
            </p>
          </div>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flags.slice(0, 2).map((flag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-red-500/10 text-red-300 border-red-500/30"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {flag}
              </Badge>
            ))}
            {flags.length > 2 && (
              <Badge
                variant="outline"
                className="text-xs bg-red-500/10 text-red-300 border-red-500/30"
              >
                +{flags.length - 2} more
              </Badge>
            )}
          </div>
        )}

        {/* Story preview */}
        <p className="text-sm text-gray-300 line-clamp-2">
          {campaign.story}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReview}
            className="flex-1 bg-white/10 border-white/20 hover:bg-white/20 h-10"
          >
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickApprove}
            className="bg-green-500/20 border-green-500/50 hover:bg-green-500/30 text-green-300 h-10 px-3"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickReject}
            className="bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300 h-10 px-3"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * MobileFilterBar Component
 * Sticky filter bar for mobile moderation
 */
export const MobileFilterBar = ({ 
  filters, 
  onFilterChange, 
  selectedCount, 
  onBulkApprove, 
  onBulkReject 
}) => {
  return (
    <div className="sticky top-0 bg-background z-10 pb-3 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/20 rounded-lg text-white"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="flex-shrink-0 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white text-sm"
        >
          <option value="under_review">Under Review</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
          className="flex-shrink-0 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white text-sm"
        >
          <option value="created_at">Date Created</option>
          <option value="goal_amount">Goal Amount</option>
          <option value="moderation_score">Score</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex gap-2 bg-black/40 p-2 rounded-lg">
          <Button
            size="sm"
            onClick={onBulkApprove}
            className="flex-1 bg-green-500/20 border-green-500/50 hover:bg-green-500/30 text-green-300"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve ({selectedCount})
          </Button>
          <Button
            size="sm"
            onClick={onBulkReject}
            className="flex-1 bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject ({selectedCount})
          </Button>
        </div>
      )}
    </div>
  );
};

export default {
  MobileCampaignCard,
  MobileFilterBar
};
