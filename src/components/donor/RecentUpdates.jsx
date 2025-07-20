import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { donationService } from '@/services/donationService';
import { formatDate, getRelativeTime } from '@/lib/utils';
import { 
  Calendar,
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronRight,
  ExternalLink,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

const RecentUpdates = ({ userId, limit = 10 }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUpdate, setExpandedUpdate] = useState(null);

  useEffect(() => {
    fetchCampaignUpdates();
  }, [userId, limit]);

  const fetchCampaignUpdates = async () => {
    try {
      setLoading(true);
      const data = await donationService.getDonorCampaignUpdates(userId, limit);
      setUpdates(data);
    } catch (error) {
      console.error('Error fetching campaign updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpdateIcon = (type) => {
    switch (type) {
      case 'text':
        return MessageSquare;
      case 'photo':
        return ImageIcon;
      case 'video':
        return Video;
      case 'receipt':
        return FileText;
      default:
        return MessageSquare;
    }
  };

  const getUpdateTypeLabel = (type) => {
    switch (type) {
      case 'text':
        return t('updates.text', 'Update');
      case 'photo':
        return t('updates.photo', 'Photo Update');
      case 'video':
        return t('updates.video', 'Video Update');
      case 'receipt':
        return t('updates.receipt', 'Receipt');
      default:
        return t('updates.update', 'Update');
    }
  };

  const toggleExpanded = (updateId) => {
    setExpandedUpdate(expandedUpdate === updateId ? null : updateId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
          {t('donor.noUpdates', 'No updates yet from campaigns you support')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => {
        const UpdateIcon = getUpdateIcon(update.update_type);
        const isExpanded = expandedUpdate === update.id;

        return (
          <motion.div
            key={update.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={update.campaign.recipient.avatar_url} />
                    <AvatarFallback>
                      {update.campaign.recipient.full_name?.charAt(0) || 'R'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {update.campaign.recipient.full_name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {update.campaign.title}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/campaigns/${update.campaign_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Update Type Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    <UpdateIcon className="h-3 w-3 mr-1" />
                    {getUpdateTypeLabel(update.update_type)}
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {getRelativeTime(update.created_at)}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {update.title && (
                    <h4 className="font-medium text-sm">{update.title}</h4>
                  )}
                  
                  <div className={`text-sm text-gray-700 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {update.content}
                  </div>

                  {update.content && update.content.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(update.id)}
                      className="text-xs"
                    >
                      {isExpanded ? t('common.showLess', 'Show less') : t('common.showMore', 'Show more')}
                    </Button>
                  )}

                  {/* Media Preview */}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <div className="mt-3">
                      {update.update_type === 'photo' && (
                        <div className="grid grid-cols-2 gap-2">
                          {update.media_urls.slice(0, 4).map((url, index) => (
                            <div key={index} className="relative aspect-square">
                              <img
                                src={url}
                                alt={`Update photo ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              {update.media_urls.length > 4 && index === 3 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-semibold">
                                    +{update.media_urls.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {update.update_type === 'video' && (
                        <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spend Amount */}
                  {update.spend_amount && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        {t('updates.amountSpent', 'Amount spent')}:
                        <span className="font-semibold ml-1">
                          ${update.spend_amount}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => navigate(`/campaigns/${update.campaign_id}`)}
                  >
                    {t('donor.viewCampaign', 'View Campaign')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default RecentUpdates;
