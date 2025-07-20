import { useState } from 'react';
import { Grid, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import CampaignCard from '@/components/campaigns/CampaignCard';
import { searchService } from '@/services/searchService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function SearchResults({ 
  campaigns, 
  loading, 
  viewMode = 'grid',
  onViewModeChange,
  searchQuery,
  className 
}) {
  const navigate = useNavigate();
  const [hoveredCampaign, setHoveredCampaign] = useState(null);

  const handleCampaignClick = async (campaign, position) => {
    // Track the click
    await searchService.trackSearchClick(campaign.id, searchQuery, position);
    
    // Navigate to campaign
    navigate(`/campaigns/${campaign.id}`);
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        )}>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-6xl">🔍</div>
          <h3 className="text-xl font-semibold">No campaigns found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or browse all campaigns
          </p>
          <Button 
            onClick={() => navigate('/campaigns')}
            variant="outline"
          >
            Browse All Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const renderListItem = (campaign, index) => (
    <Card 
      key={campaign.id}
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => handleCampaignClick(campaign, index)}
      onMouseEnter={() => setHoveredCampaign(campaign.id)}
      onMouseLeave={() => setHoveredCampaign(null)}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-48 h-32 flex-shrink-0">
          {campaign.image_url ? (
            <img 
              src={campaign.image_url} 
              alt={campaign.title}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-md flex items-center justify-center">
              <span className="text-3xl opacity-50">🎯</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">
              {campaign.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {campaign.is_featured && (
                <Badge variant="default">Featured</Badge>
              )}
              {campaign.is_verified && (
                <Badge variant="secondary">Verified</Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {campaign.description}
          </p>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {formatCurrency(campaign.current_amount)}
              </span>
              <span className="text-muted-foreground">
                of {formatCurrency(campaign.goal_amount)}
              </span>
              <Badge variant="outline">
                {Math.round(campaign.progress_percentage || 0)}%
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground">
              {campaign.category && (
                <Badge variant="secondary">{campaign.category}</Badge>
              )}
              {campaign.location && (
                <span className="text-xs">{campaign.location}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'} found
        </h2>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              onClick={() => handleCampaignClick(campaign, index)}
              className="cursor-pointer"
            >
              <CampaignCard 
                campaign={{
                  ...campaign,
                  creator: campaign.creator_name ? {
                    full_name: campaign.creator_name
                  } : null
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign, index) => renderListItem(campaign, index))}
        </div>
      )}
    </div>
  );
}
