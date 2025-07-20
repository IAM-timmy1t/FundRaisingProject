import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationService } from '@/services/donationService';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';
import { 
  Heart, 
  Calendar, 
  Target,
  TrendingUp,
  Users,
  Clock,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

const FollowedCampaigns = ({ userId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    fetchFollowedCampaigns();
  }, [userId]);

  const fetchFollowedCampaigns = async () => {
    try {
      setLoading(true);
      const data = await donationService.getFollowedCampaigns(userId);
      setCampaigns(data);
    } catch (error) {
      console.error('Error fetching followed campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['FUNDING', 'APPROVED'].includes(campaign.status);
    if (filter === 'completed') return ['FUNDED', 'COMPLETED'].includes(campaign.status);
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'FUNDING':
        return 'default';
      case 'FUNDED':
        return 'success';
      case 'COMPLETED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getProgressPercentage = (raised, goal) => {
    return Math.min((raised / goal) * 100, 100);
  };

  const getDaysLeft = (deadline) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">
          {t('donor.noFollowedCampaigns', "You haven't supported any campaigns yet")}
        </p>
        <Button onClick={() => navigate('/campaigns')}>
          {t('donor.exploreCampaigns', 'Explore Campaigns')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({campaigns.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Active ({campaigns.filter(c => ['FUNDING', 'APPROVED'].includes(c.status)).length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          Completed ({campaigns.filter(c => ['FUNDED', 'COMPLETED'].includes(c.status)).length})
        </Button>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => {
          const progress = getProgressPercentage(campaign.raised_amount, campaign.goal_amount);
          const daysLeft = getDaysLeft(campaign.deadline);

          return (
            <Card 
              key={campaign.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            >
              <CardContent className="p-4 space-y-4">
                {/* Recipient Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={campaign.recipient.avatar_url} />
                    <AvatarFallback>
                      {campaign.recipient.full_name?.charAt(0) || 'R'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{campaign.recipient.full_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={campaign.recipient.trust_tier?.toLowerCase() || 'default'} className="text-xs">
                        {campaign.recipient.trust_tier || 'NEW'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Score: {campaign.recipient.trust_score || 0}
                      </span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(campaign.status)} className="text-xs">
                    {campaign.status}
                  </Badge>
                </div>

                {/* Campaign Title */}
                <div>
                  <h3 className="font-semibold line-clamp-2 hover:text-blue-600 transition-colors">
                    {campaign.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {campaign.need_type}
                    </span>
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {daysLeft} days left
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {formatCurrency(campaign.raised_amount, campaign.currency)}
                    </span>
                    <span className="font-medium">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    of {formatCurrency(campaign.goal_amount, campaign.currency)} goal
                  </p>
                </div>

                {/* Campaign Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {getRelativeTime(campaign.created_at)}
                  </span>
                  {campaign.status === 'FUNDING' && daysLeft === 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      Ending soon
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/campaigns/${campaign.id}`);
                  }}
                >
                  View Campaign
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FollowedCampaigns;
