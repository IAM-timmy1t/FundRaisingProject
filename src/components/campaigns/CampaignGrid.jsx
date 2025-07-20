import React from 'react';
import CampaignCard from './CampaignCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const CampaignGrid = ({ campaigns, loading = false, itemsPerRow = 3 }) => {
  const navigate = useNavigate();

  const handleCampaignClick = (campaign) => {
    navigate(`/campaigns/${campaign.slug || campaign.id}`);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`grid gap-6 ${getGridClasses(itemsPerRow)}`}>
        {[...Array(itemsPerRow * 2)].map((_, index) => (
          <CampaignCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No campaigns found</p>
          <p className="text-sm">Try adjusting your filters or search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${getGridClasses(itemsPerRow)}`}>
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onClick={handleCampaignClick}
        />
      ))}
    </div>
  );
};

// Helper function to get responsive grid classes
const getGridClasses = (itemsPerRow) => {
  const classes = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };
  return classes[itemsPerRow] || classes[3];
};

// Loading skeleton component
const CampaignCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-video rounded-lg" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  </div>
);

export default CampaignGrid;