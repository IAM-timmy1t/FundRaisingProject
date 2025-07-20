import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Globe, 
  Users, 
  Heart,
  Target,
  Award,
  PieChart
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const ImpactMetrics = ({ impact }) => {
  const { t } = useTranslation();

  if (!impact) {
    return <div>Loading impact data...</div>;
  }

  const needTypeIcons = {
    medical: '🏥',
    education: '📚',
    emergency: '🚨',
    food: '🍽️',
    shelter: '🏠',
    religious: '⛪',
    community: '👥',
    disaster: '🌊',
    other: '💝'
  };

  const needTypeLabels = {
    medical: t('needTypes.medical', 'Medical'),
    education: t('needTypes.education', 'Education'),
    emergency: t('needTypes.emergency', 'Emergency'),
    food: t('needTypes.food', 'Food'),
    shelter: t('needTypes.shelter', 'Shelter'),
    religious: t('needTypes.religious', 'Religious'),
    community: t('needTypes.community', 'Community'),
    disaster: t('needTypes.disaster', 'Disaster Relief'),
    other: t('needTypes.other', 'Other')
  };

  // Calculate percentages for need types
  const totalNeeds = Object.values(impact.needTypesBreakdown || {}).reduce((sum, count) => sum + count, 0);
  const needTypePercentages = Object.entries(impact.needTypesBreakdown || {}).map(([type, count]) => ({
    type,
    count,
    percentage: totalNeeds > 0 ? (count / totalNeeds) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  const metrics = [
    {
      icon: TrendingUp,
      label: t('donor.totalImpact', 'Total Impact'),
      value: formatCurrency(impact.totalDonated),
      color: 'text-green-600'
    },
    {
      icon: Users,
      label: t('donor.peopleHelped', 'People Helped'),
      value: impact.recipientsHelped,
      color: 'text-blue-600'
    },
    {
      icon: Globe,
      label: t('donor.globalReach', 'Global Reach'),
      value: `${impact.countriesReached} ${t('donor.countries', 'countries')}`,
      color: 'text-purple-600'
    },
    {
      icon: Target,
      label: t('donor.campaignSuccess', 'Campaign Success'),
      value: `${impact.fundedCampaigns} ${t('donor.funded', 'funded')}`,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white ${metric.color}`}>
                <metric.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{metric.label}</p>
                <p className="font-semibold text-lg">{metric.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Campaign Status */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {t('donor.campaignStatus', 'Campaign Status')}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('donor.activeCampaigns', 'Active Campaigns')}
            </span>
            <Badge variant="default">{impact.activeCampaigns}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('donor.completedCampaigns', 'Completed Campaigns')}
            </span>
            <Badge variant="success">{impact.fundedCampaigns}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('donor.totalSupported', 'Total Supported')}
            </span>
            <Badge variant="secondary">{impact.campaignsSupported}</Badge>
          </div>
        </div>
      </div>

      {/* Need Types Breakdown */}
      {needTypePercentages.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {t('donor.impactByCategory', 'Impact by Category')}
          </h4>
          <div className="space-y-3">
            {needTypePercentages.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{needTypeIcons[item.type] || '💝'}</span>
                    <span className="text-gray-700">
                      {needTypeLabels[item.type] || item.type}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    {item.count} {t('donor.campaigns', 'campaigns')}
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Award className="h-4 w-4" />
          {t('donor.achievements', 'Your Achievements')}
        </h4>
        <div className="flex flex-wrap gap-2">
          {impact.campaignsSupported >= 1 && (
            <Badge variant="secondary" className="py-1.5">
              🌟 {t('donor.firstDonation', 'First Donation')}
            </Badge>
          )}
          {impact.campaignsSupported >= 5 && (
            <Badge variant="secondary" className="py-1.5">
              ⭐ {t('donor.supporter', 'Campaign Supporter')}
            </Badge>
          )}
          {impact.campaignsSupported >= 10 && (
            <Badge variant="secondary" className="py-1.5">
              🏆 {t('donor.champion', 'Impact Champion')}
            </Badge>
          )}
          {impact.countriesReached >= 3 && (
            <Badge variant="secondary" className="py-1.5">
              🌍 {t('donor.globalGiver', 'Global Giver')}
            </Badge>
          )}
          {impact.fundedCampaigns >= 1 && (
            <Badge variant="secondary" className="py-1.5">
              🎯 {t('donor.goalAchiever', 'Goal Achiever')}
            </Badge>
          )}
          {impact.totalDonated >= 1000 && (
            <Badge variant="secondary" className="py-1.5">
              💎 {t('donor.generousHeart', 'Generous Heart')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactMetrics;
