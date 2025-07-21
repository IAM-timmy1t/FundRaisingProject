import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp,
  Edit,
  Eye,
  MessageSquare,
  MoreVertical,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';

const CampaignOverviewCards = ({ campaigns }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'success' },
      approved: { label: 'Approved', variant: 'default' },
      pending: { label: 'Pending Review', variant: 'warning' },
      completed: { label: 'Completed', variant: 'secondary' },
      draft: { label: 'Draft', variant: 'outline' },
      rejected: { label: 'Rejected', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = Math.abs(end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return end > now ? diffDays : 0;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('recipient.noCampaigns', 'No campaigns yet')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('recipient.noCampaignsDesc', 'Start your fundraising journey by creating your first campaign')}
          </p>
          <Button onClick={() => navigate('/campaigns/create')}>
            {t('recipient.createFirstCampaign', 'Create Your First Campaign')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {campaigns.map((campaign, index) => {
        const progressPercentage = (campaign.current_amount / campaign.goal_amount) * 100;
        const daysRemaining = calculateDaysRemaining(campaign.end_date);
        const isExpanded = expandedCampaign === campaign.id;

        return (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(campaign.status)}
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysRemaining} days left
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}/update`)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Post Update
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Funding Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {t('campaign.fundingProgress', 'Funding Progress')}
                    </span>
                    <span className="text-sm font-semibold">
                      {progressPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                    indicatorClassName={getProgressColor(progressPercentage)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold">
                      {formatCurrency(campaign.current_amount || 0)}
                    </span>
                    <span className="text-sm text-gray-600">
                      of {formatCurrency(campaign.goal_amount)}
                    </span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-lg font-semibold">{campaign.donor_count || 0}</p>
                    <p className="text-xs text-gray-600">Donors</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-lg font-semibold">
                      {campaign.donation_count || 0}
                    </p>
                    <p className="text-xs text-gray-600">Donations</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-lg font-semibold">
                      {campaign.donation_count > 0 
                        ? formatCurrency(campaign.current_amount / campaign.donation_count)
                        : '$0'
                      }
                    </p>
                    <p className="text-xs text-gray-600">Avg. Donation</p>
                  </div>
                </div>

                {/* Recent Activity */}
                {campaign.last_donation_date && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Last donation: {getRelativeTime(campaign.last_donation_date)}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/campaigns/${campaign.id}/update`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Update
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

export default CampaignOverviewCards;