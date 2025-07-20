import { useState, useEffect } from 'react';
import { Facebook, Twitter, Linkedin, MessageCircle, Send, Mail, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { socialSharingService } from '@/services/socialSharingService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { cn } from '@/lib/utils';

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black hover:bg-gray-800' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700 hover:bg-blue-800' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-600 hover:bg-green-700' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'email', name: 'Email', icon: Mail, color: 'bg-gray-600 hover:bg-gray-700' }
];

export default function SocialShareWidget({ campaign, className, onShare, variant = 'default' }) {
  const [copied, setCopied] = useState(false);
  const [shareUrls, setShareUrls] = useState({});
  const [shareStats, setShareStats] = useState({});
  const [hasShared, setHasShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (campaign) {
      const baseUrl = window.location.origin;
      const urls = socialSharingService.generateShareUrls(campaign, baseUrl);
      setShareUrls(urls);

      // Load share stats
      loadShareStats();
      
      // Check if user has shared
      if (user) {
        checkUserShare();
      }
    }
  }, [campaign, user]);

  const loadShareStats = async () => {
    try {
      const stats = await socialSharingService.getShareStats(campaign.id);
      setShareStats(stats);
    } catch (error) {
      console.error('Error loading share stats:', error);
    }
  };

  const checkUserShare = async () => {
    try {
      const shared = await socialSharingService.hasUserShared(campaign.id, user.id);
      setHasShared(shared);
    } catch (error) {
      console.error('Error checking user share:', error);
    }
  };

  const handleShare = async (platform) => {
    try {
      setIsLoading(true);

      // Track the share
      await socialSharingService.trackShare(campaign.id, platform, user?.id);

      // Open share URL
      if (platform === 'copy') {
        await handleCopyLink();
      } else if (platform === 'email') {
        window.location.href = shareUrls[platform];
      } else {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      }

      // Check for milestones
      const milestoneResult = await socialSharingService.checkShareMilestones(campaign.id);
      if (milestoneResult?.newMilestone) {
        toast.success(`🎉 Campaign reached ${milestoneResult.newMilestone} shares!`);
      }

      // Update local state
      setHasShared(true);
      await loadShareStats();

      // Callback
      if (onShare) {
        onShare(platform);
      }

      toast.success(`Shared on ${platform}!`);
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrls.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const getTotalShares = () => {
    return Object.values(shareStats).reduce((sum, count) => sum + count, 0);
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share {getTotalShares() > 0 && `(${getTotalShares()})`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share Campaign</DialogTitle>
              <DialogDescription>
                Help {campaign.title} reach more people by sharing
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {platforms.map((platform) => (
                <Button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center gap-2 h-auto py-4 text-white',
                    platform.color
                  )}
                >
                  <platform.icon className="w-5 h-5" />
                  <span className="text-xs">{platform.name}</span>
                  {shareStats[platform.id] > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {shareStats[platform.id]}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrls.copy || ''}
                  className="flex-1"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  disabled={isLoading}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Share Campaign</span>
          {getTotalShares() > 0 && (
            <Badge variant="secondary">
              {getTotalShares()} shares
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Help {campaign.title} reach more supporters by sharing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="direct">Direct Share</TabsTrigger>
          </TabsList>
          
          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {platforms.slice(0, 4).map((platform) => (
                <Button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-2 text-white',
                    platform.color
                  )}
                >
                  <platform.icon className="w-4 h-4" />
                  {platform.name}
                  {shareStats[platform.id] > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {shareStats[platform.id]}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="direct" className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={() => handleShare('telegram')}
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center gap-2 text-white',
                  platforms.find(p => p.id === 'telegram').color
                )}
              >
                <Send className="w-4 h-4" />
                Telegram
                {shareStats.telegram > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {shareStats.telegram}
                  </Badge>
                )}
              </Button>

              <Button
                onClick={() => handleShare('email')}
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center gap-2 text-white',
                  platforms.find(p => p.id === 'email').color
                )}
              >
                <Mail className="w-4 h-4" />
                Email
                {shareStats.email > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {shareStats.email}
                  </Badge>
                )}
              </Button>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">Copy link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrls.copy || ''}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    disabled={isLoading}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {hasShared && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✨ Thank you for sharing! You're helping this campaign reach more people.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}