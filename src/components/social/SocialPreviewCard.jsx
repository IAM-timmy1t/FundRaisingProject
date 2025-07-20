import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Component for generating social media preview cards
export default function SocialPreviewCard({ campaign, variant = 'default' }) {
  const progressPercentage = campaign?.current_amount && campaign?.goal_amount
    ? Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100)
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (variant === 'meta') {
    // This variant is for server-side rendering of meta tags
    return null;
  }

  if (variant === 'twitter') {
    return (
      <Card className="w-full max-w-[500px] overflow-hidden">
        <div className="aspect-[2/1] relative">
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-lg font-bold line-clamp-1">{campaign?.title}</h3>
            <p className="text-sm opacity-90 line-clamp-1">{campaign?.description}</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{formatCurrency(campaign?.current_amount)}</span>
            <span className="text-sm text-muted-foreground">of {formatCurrency(campaign?.goal_amount)}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{Math.round(progressPercentage)}% funded</span>
            <span>{campaign?.donation_count || 0} supporters</span>
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'facebook') {
    return (
      <Card className="w-full max-w-[500px] overflow-hidden">
        <div className="aspect-[1.91/1] relative">
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10" />
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-xl font-bold line-clamp-1">{campaign?.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{campaign?.description}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{formatCurrency(campaign?.current_amount)}</span>
              <Badge variant="secondary">{Math.round(progressPercentage)}% funded</Badge>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">
              <span className="font-medium">{campaign?.donation_count || 0}</span>
              <span className="text-muted-foreground"> supporters</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Goal: {formatCurrency(campaign?.goal_amount)}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default preview card
  return (
    <Card className="w-full max-w-[600px] overflow-hidden">
      <div className="aspect-video relative">
        {campaign?.image_url ? (
          <img 
            src={campaign.image_url} 
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-4xl opacity-20">🎯</span>
          </div>
        )}
        {campaign?.category && (
          <Badge className="absolute top-4 left-4">{campaign.category}</Badge>
        )}
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold line-clamp-2">{campaign?.title}</h2>
          <p className="text-muted-foreground line-clamp-3 mt-2">{campaign?.description}</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{formatCurrency(campaign?.current_amount)}</p>
              <p className="text-sm text-muted-foreground">raised of {formatCurrency(campaign?.goal_amount)} goal</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {Math.round(progressPercentage)}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="font-semibold">{campaign?.donation_count || 0}</span>
              <span className="text-muted-foreground"> donors</span>
            </div>
            {campaign?.end_date && (
              <div>
                <span className="font-semibold">
                  {Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)))}
                </span>
                <span className="text-muted-foreground"> days left</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {campaign?.status || 'Active'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

// Helper component to generate Open Graph meta tags
export function SocialMetaTags({ campaign, url }) {
  useEffect(() => {
    if (!campaign || typeof document === 'undefined') return;

    // Update or create meta tags
    const updateMetaTag = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const updateTwitterMetaTag = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Open Graph tags
    updateMetaTag('og:title', campaign.title);
    updateMetaTag('og:description', campaign.description?.substring(0, 160) || '');
    updateMetaTag('og:image', campaign.image_url || '/default-campaign-image.jpg');
    updateMetaTag('og:url', url || window.location.href);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:site_name', 'FundRaising Platform');

    // Twitter Card tags
    updateTwitterMetaTag('twitter:card', 'summary_large_image');
    updateTwitterMetaTag('twitter:title', campaign.title);
    updateTwitterMetaTag('twitter:description', campaign.description?.substring(0, 160) || '');
    updateTwitterMetaTag('twitter:image', campaign.image_url || '/default-campaign-image.jpg');

    // Additional structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'DonateAction',
      'name': campaign.title,
      'description': campaign.description,
      'recipient': {
        '@type': 'Organization',
        'name': campaign.creator?.full_name || 'Campaign Creator'
      },
      'price': campaign.goal_amount?.toString(),
      'priceCurrency': 'USD'
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Update page title
    document.title = `${campaign.title} - Help Fund This Campaign`;

  }, [campaign, url]);

  return null;
}