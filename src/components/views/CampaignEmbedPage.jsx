import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function CampaignEmbedPage() {
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const campaignId = searchParams.get('id');
  const embedType = searchParams.get('type') || 'widget';
  const theme = searchParams.get('theme') || 'light';
  const showTitle = searchParams.get('showTitle') !== 'false';
  const showProgress = searchParams.get('showProgress') !== 'false';
  const showDonateButton = searchParams.get('showDonateButton') !== 'false';
  const showDescription = searchParams.get('showDescription') === 'true';
  const buttonText = searchParams.get('buttonText') || 'Donate Now';
  const primaryColor = searchParams.get('primaryColor') || '#3b82f6';

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
      trackEmbedView();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackEmbedView = async () => {
    try {
      const domain = window.location.hostname;
      const pageUrl = window.location.href;

      // Update or create embed analytics record
      await supabase.rpc('track_embed_view', {
        campaign_id_param: campaignId,
        embed_type_param: embedType,
        domain_param: domain,
        page_url_param: pageUrl
      });
    } catch (error) {
      console.error('Error tracking embed view:', error);
    }
  };

  const handleDonateClick = async () => {
    try {
      // Track embed click
      await supabase.rpc('track_embed_click', {
        campaign_id_param: campaignId,
        embed_type_param: embedType
      });

      // Open campaign in new window
      window.open(`${window.location.origin}/campaigns/${campaignId}`, '_blank');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>
    );
  }

  const progressPercentage = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (embedType === 'progress') {
    return (
      <div className="p-4 bg-background">
        <div className="space-y-2">
          {showTitle && (
            <h3 className="font-semibold text-sm line-clamp-1">{campaign.title}</h3>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">${campaign.current_amount.toLocaleString()}</span>
              <span className="text-muted-foreground">of ${campaign.goal_amount.toLocaleString()}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(progressPercentage)}% funded</span>
              <span>{campaign.donation_count || 0} donors</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (embedType === 'button') {
    // This is handled differently - returns raw HTML
    return null;
  }

  // Default widget embed
  return (
    <div className="p-4 bg-background">
      <div className="space-y-4">
        {/* Campaign Image */}
        {campaign.image_url && (
          <div className="aspect-video rounded-lg overflow-hidden">
            <img 
              src={campaign.image_url} 
              alt={campaign.title}
              className="w-full h-full object-cover"
              onClick={handleDonateClick}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Campaign Info */}
        {showTitle && (
          <h2 className="text-lg font-bold line-clamp-2">{campaign.title}</h2>
        )}

        {showDescription && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {campaign.description}
          </p>
        )}

        {/* Progress */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">${campaign.current_amount.toLocaleString()}</span>
              <Badge variant="secondary">{Math.round(progressPercentage)}%</Badge>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>of ${campaign.goal_amount.toLocaleString()} goal</span>
              <span>{campaign.donation_count || 0} donors</span>
            </div>
          </div>
        )}

        {/* Donate Button */}
        {showDonateButton && (
          <Button 
            onClick={handleDonateClick}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            {buttonText}
          </Button>
        )}

        {/* Attribution */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          Powered by FundRaising Platform
        </div>
      </div>
    </div>
  );
}