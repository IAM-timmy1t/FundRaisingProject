import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, TrendingUp, Award, Calendar, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const CrowdfundingStats = ({ profile, detailed = false }) => {
  const getDonorStats = () => [
    {
      icon: Heart,
      label: 'Total Donated',
      value: `£${(profile.total_donated || 0).toLocaleString()}`,
      color: 'text-red-500',
      bgColor: 'bg-red-100'
    },
    {
      icon: Users,
      label: 'Campaigns Supported',
      value: profile.campaigns_supported || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    {
      icon: TrendingUp,
      label: 'Average Donation',
      value: profile.campaigns_supported > 0 
        ? `£${Math.round(profile.total_donated / profile.campaigns_supported).toLocaleString()}`
        : '£0',
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      icon: Award,
      label: 'Impact Score',
      value: calculateImpactScore(profile),
      color: 'text-purple-500',
      bgColor: 'bg-purple-100'
    }
  ];

  const getRecipientStats = () => [
    {
      icon: Heart,
      label: 'Total Received',
      value: `£${(profile.total_received || 0).toLocaleString()}`,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      icon: Zap,
      label: 'Campaigns Created',
      value: profile.campaigns_created || 0,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Users,
      label: 'Total Donors',
      value: profile.metadata?.totalDonors || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Calendar,
      label: 'Active Since',
      value: getActiveDuration(profile.created_at),
      color: 'text-purple-500',
      bgColor: 'bg-purple-100'
    }
  ];

  function calculateImpactScore(profile) {
    // Simple impact score calculation
    const donationScore = Math.min(profile.total_donated / 100, 50);
    const campaignScore = Math.min(profile.campaigns_supported * 2, 30);
    const trustScore = (profile.trust_score / 100) * 20;
    
    return Math.round(donationScore + campaignScore + trustScore);
  }

  function getActiveDuration(createdAt) {
    if (!createdAt) return 'New';
    
    const months = Math.floor(
      (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 30)
    );
    
    if (months < 1) return 'New';
    if (months < 12) return `${months}mo`;
    
    const years = Math.floor(months / 12);
    return `${years}y`;
  }

  const stats = profile.role === 'donor' ? getDonorStats() : getRecipientStats();

  if (!detailed) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                    <Icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Detailed view with additional metrics
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crowdfunding Impact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded', stat.bgColor)}>
                    <Icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold pl-8">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {profile.role === 'recipient' && profile.metadata?.campaignSuccessRate !== undefined && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Campaign Success Rate</span>
              <span className="font-medium">
                {Math.round(profile.metadata.campaignSuccessRate)}%
              </span>
            </div>
            <Progress value={profile.metadata.campaignSuccessRate} className="h-2" />
          </div>
        )}

        {/* Monthly Activity Trend */}
        {profile.metadata?.monthlyActivity && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            <div className="flex items-end gap-1 h-16">
              {profile.metadata.monthlyActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                  style={{ height: `${(activity / Math.max(...profile.metadata.monthlyActivity)) * 100}%` }}
                  title={`Month ${index + 1}: ${activity} activities`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Last 6 months activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrowdfundingStats;