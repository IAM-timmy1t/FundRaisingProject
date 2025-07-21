import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronRight,
  History,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { userProfileService } from '@/lib/userProfileService';
import { useTranslation } from 'react-i18next';
import { formatDate, getRelativeTime } from '@/lib/utils';

const TrustScoreInsights = ({ userId, currentScore, currentTier }) => {
  const { t } = useTranslation();
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userId) {
      fetchTrustHistory();
    }
  }, [userId]);

  const fetchTrustHistory = async () => {
    try {
      const { data, error } = await userProfileService.getTrustScoreHistory(userId, 20);
      if (!error && data) {
        setTrustHistory(data);
      }
    } catch (error) {
      console.error('Error fetching trust history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = () => {
    const tiers = {
      NEW: {
        name: 'New Member',
        color: 'bg-gray-500',
        icon: Shield,
        nextTier: 'RISING',
        minScore: 0,
        maxScore: 250
      },
      RISING: {
        name: 'Rising Member',
        color: 'bg-blue-500',
        icon: TrendingUp,
        nextTier: 'TRUSTED',
        minScore: 250,
        maxScore: 500
      },
      TRUSTED: {
        name: 'Trusted Member',
        color: 'bg-purple-500',
        icon: CheckCircle,
        nextTier: 'STAR',
        minScore: 500,
        maxScore: 750
      },
      STAR: {
        name: 'Star Contributor',
        color: 'bg-yellow-500',
        icon: Award,
        nextTier: null,
        minScore: 750,
        maxScore: 1000
      }
    };

    return tiers[currentTier] || tiers.NEW;
  };

  const tierInfo = getTierInfo();
  const progressToNextTier = currentTier !== 'STAR' 
    ? ((currentScore - tierInfo.minScore) / (tierInfo.maxScore - tierInfo.minScore)) * 100
    : 100;

  const trustFactors = [
    {
      category: 'Profile Completion',
      description: 'Complete your profile with all required information',
      impact: '+50 points',
      status: 'completed',
      tips: [
        'Add a profile photo',
        'Verify your phone number',
        'Complete bio section'
      ]
    },
    {
      category: 'Campaign Updates',
      description: 'Post regular updates to keep donors informed',
      impact: '+20 points per update',
      status: 'active',
      tips: [
        'Update at least weekly',
        'Include photos or videos',
        'Share specific impact stories'
      ]
    },
    {
      category: 'Donor Engagement',
      description: 'Respond to donor messages and comments',
      impact: '+10 points per interaction',
      status: 'active',
      tips: [
        'Thank donors personally',
        'Answer questions promptly',
        'Share appreciation posts'
      ]
    },
    {
      category: 'Transparency',
      description: 'Provide detailed fund usage reports',
      impact: '+30 points per report',
      status: 'pending',
      tips: [
        'Show exactly how funds are used',
        'Include receipts when possible',
        'Break down expenses clearly'
      ]
    }
  ];

  const recentEvents = trustHistory.slice(0, 5).map(event => ({
    ...event,
    icon: event.change_amount > 0 ? TrendingUp : TrendingDown,
    color: event.change_amount > 0 ? 'text-green-600' : 'text-red-600'
  }));

  return (
    <div className="space-y-6">
      {/* Trust Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t('trust.yourTrustScore', 'Your Trust Score')}
          </CardTitle>
          <CardDescription>
            {t('trust.scoreDescription', 'Build trust with donors through transparency and engagement')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Score Display */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${tierInfo.color} bg-opacity-10`}>
                  <tierInfo.icon className={`h-8 w-8 ${tierInfo.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{currentScore}</p>
                  <p className="text-lg font-medium">{tierInfo.name}</p>
                </div>
              </div>

              {tierInfo.nextTier && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to {tierInfo.nextTier}</span>
                    <span>{Math.round(progressToNextTier)}%</span>
                  </div>
                  <Progress value={progressToNextTier} className="h-2" />
                  <p className="text-sm text-gray-600">
                    {tierInfo.maxScore - currentScore} points to next tier
                  </p>
                </div>
              )}
            </div>

            {/* Tier Benefits */}
            <div className="space-y-3">
              <h4 className="font-medium">Tier Benefits</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-sm">Enhanced visibility in search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-sm">Trust badge on your campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-sm">Priority support from our team</span>
                </li>
                {currentTier === 'STAR' && (
                  <li className="flex items-start gap-2">
                    <Award className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <span className="text-sm">Featured campaigns section</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Building Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="improve">How to Improve</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Trust Factors */}
          <Card>
            <CardHeader>
              <CardTitle>{t('trust.trustFactors', 'Trust Factors')}</CardTitle>
              <CardDescription>
                {t('trust.factorsDescription', 'Key areas that impact your trust score')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trustFactors.map((factor, index) => (
                  <motion.div
                    key={factor.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start justify-between p-4 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{factor.category}</h4>
                        <Badge 
                          variant={factor.status === 'completed' ? 'success' : 
                                  factor.status === 'active' ? 'default' : 'secondary'}
                        >
                          {factor.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {factor.impact}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improve" className="space-y-4">
          {/* Improvement Tips */}
          {trustFactors.filter(f => f.status !== 'completed').map((factor, index) => (
            <Card key={factor.category}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {factor.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>How to improve</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      {factor.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Potential impact:</span>
                  <span className="font-medium text-green-600">{factor.impact}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Recent Trust Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('trust.recentActivity', 'Recent Trust Activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <event.icon className={`h-5 w-5 ${event.color}`} />
                        <div>
                          <p className="font-medium">{event.event_type}</p>
                          <p className="text-sm text-gray-600">
                            {getRelativeTime(event.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${event.color}`}>
                        {event.change_amount > 0 ? '+' : ''}{event.change_amount} points
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">
                  {t('trust.noRecentActivity', 'No recent trust score activity')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrustScoreInsights;