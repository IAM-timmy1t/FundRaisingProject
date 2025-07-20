import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CampaignCard from '@/components/campaigns/CampaignCard';
import { searchService } from '@/services/searchService';
import { cn } from '@/lib/utils';

export default function RelatedCampaigns({ currentCampaignIds, className }) {
  const [relatedCampaigns, setRelatedCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const itemsPerPage = 3;

  useEffect(() => {
    if (currentCampaignIds && currentCampaignIds.length > 0) {
      loadRelatedCampaigns();
    }
  }, [currentCampaignIds]);

  const loadRelatedCampaigns = async () => {
    try {
      setIsLoading(true);
      
      // Get related campaigns for each current campaign
      const allRelated = await Promise.all(
        currentCampaignIds.slice(0, 3).map(id => 
          searchService.getRelatedCampaigns(id, 4)
        )
      );
      
      // Flatten and deduplicate
      const flatRelated = allRelated.flat();
      const uniqueRelated = Array.from(
        new Map(flatRelated.map(item => [item.id, item])).values()
      ).filter(campaign => !currentCampaignIds.includes(campaign.id));
      
      // Sort by similarity score and take top campaigns
      const sortedRelated = uniqueRelated
        .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
        .slice(0, 12);
      
      setRelatedCampaigns(sortedRelated);
    } catch (error) {
      console.error('Error loading related campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - itemsPerPage));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(
      relatedCampaigns.length - itemsPerPage,
      currentIndex + itemsPerPage
    ));
  };

  if (isLoading || relatedCampaigns.length === 0) {
    return null;
  }

  const visibleCampaigns = relatedCampaigns.slice(
    currentIndex,
    currentIndex + itemsPerPage
  );
  
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex + itemsPerPage < relatedCampaigns.length;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>You Might Also Like</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your search results
            </p>
          </div>
          
          {relatedCampaigns.length > itemsPerPage && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={{
                id: campaign.id,
                title: campaign.title,
                image_url: campaign.image_url,
                current_amount: campaign.current_amount,
                goal_amount: campaign.goal_amount,
                progress: (campaign.current_amount / campaign.goal_amount) * 100
              }}
              variant="compact"
            />
          ))}
        </div>
        
        {relatedCampaigns.length > itemsPerPage && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing {currentIndex + 1}-{Math.min(currentIndex + itemsPerPage, relatedCampaigns.length)} of {relatedCampaigns.length} related campaigns
          </div>
        )}
      </CardContent>
    </Card>
  );
}
