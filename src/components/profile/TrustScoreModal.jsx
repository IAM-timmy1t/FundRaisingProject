import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Clock, 
  Receipt, 
  Heart, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TrustScoreChart from './TrustScoreChart';
import { supabase } from '@/integrations/supabase/client';

const TrustScoreModal = ({ 
  isOpen, 
  onClose, 
  score, 
  tier, 
  metrics,
  userId,
  previousScore
}) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchHistoricalData();
      generateRecommendations();
    }
  }, [isOpen, userId]);

  const fetchHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from('trust_score_events')
        .select('new_score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(30);

      if (!error && data) {
        setHistoricalData(data.map(event => ({
          date: new Date(event.created_at).toLocaleDateString(),
          score: event.new_score
        })));
      }
    } catch (error) {
      console.error('Error fetching trust score history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = () => {
    const recs = [];
    
    if (metrics.updateTimeliness < 60) {
      recs.push({
        type: 'warning',
        icon: Clock,
        title: 'Improve Update Timeliness',
        description: 'Post updates at least every 7-14 days to keep donors informed'
      });
    }
    
    if (metrics.spendProofAccuracy < 70) {
      recs.push({
        type: 'warning',
        icon: Receipt,
        title: 'Add Spending Proofs',
        description: 'Include receipts and payment references with your spending updates'
      });
    }
    
    if (metrics.kycDepth < 70) {
      recs.push({
        type: 'info',
        icon: CheckCircle,
        title: 'Complete Verification',
        description: 'Verify your identity to significantly boost your trust score'
      });
    }
    
    if (metrics.donorSentiment < 60) {
      recs.push({
        type: 'warning',
        icon: Heart,
        title: 'Engage with Donors',
        description: 'Respond to donor comments and feedback to improve sentiment'
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        type: 'success',
        icon: Shield,
        title: 'Excellent Trust Score!',
        description: 'Keep up the great work maintaining transparency and engagement'
      });
    }
    
    setRecommendations(recs);
  };

  const getMetricInfo = (metricName) => {
    const info = {
      updateTimeliness: {
        icon: Clock,
        label: 'Update Timeliness',
        weight: '40%',
        description: 'How regularly you post campaign updates'
      },
      spendProofAccuracy: {
        icon: Receipt,
        label: 'Spend Accuracy',
        weight: '30%',
        description: 'Percentage of spending backed by receipts'
      },
      donorSentiment: {
        icon: Heart,
        label: 'Donor Sentiment',
        weight: '15%',
        description: 'Average rating and feedback from donors'
      },
      kycDepth: {
        icon: CheckCircle,
        label: 'Verification Level',
        weight: '10%',
        description: 'Your identity verification status'
      },
      anomalyScore: {
        icon: AlertTriangle,
        label: 'Trust Signals',
        weight: '5%',
        description: 'Absence of suspicious activity patterns'
      }
    };
    return info[metricName] || {};
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const tierColors = {
    NEW: 'from-gray-400 to-gray-600',
    RISING: 'from-blue-400 to-blue-600',
    STEADY: 'from-green-400 to-green-600',
    TRUSTED: 'from-purple-400 to-purple-600',
    STAR: 'from-yellow-400 via-orange-400 to-red-400'
  };

  const scoreDiff = previousScore ? score - previousScore : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            Trust Score Analysis
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of your trust score and performance metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Score Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">{score.toFixed(1)}</span>
                    <span className="text-xl text-muted-foreground">/ 100</span>
                    {scoreDiff !== 0 && (
                      <div className={cn(
                        'flex items-center gap-1 text-sm font-medium',
                        scoreDiff > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {scoreDiff > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {Math.abs(scoreDiff).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <Badge className={cn(
                    'bg-gradient-to-r text-white',
                    tierColors[tier]
                  )}>
                    {tier} TIER
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Updated: {new Date().toLocaleDateString()}</p>
                  <p>Confidence: {metrics.confidence || 85}%</p>
                </div>
              </div>
              <Progress value={score} className="h-3" />
            </CardContent>
          </Card>

          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="improve">Improve</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdown" className="space-y-4">
              {Object.entries(metrics).filter(([key]) => 
                ['updateTimeliness', 'spendProofAccuracy', 'donorSentiment', 'kycDepth', 'anomalyScore'].includes(key)
              ).map(([key, value]) => {
                const info = getMetricInfo(key);
                const Icon = info.icon;
                return (
                  <Card key={key}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              getProgressColor(value).replace('bg-', 'bg-opacity-10 bg-')
                            )}>
                              <Icon className={cn('w-5 h-5', getScoreColor(value))} />
                            </div>
                            <div>
                              <h4 className="font-medium">{info.label}</h4>
                              <p className="text-sm text-muted-foreground">{info.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn('text-2xl font-bold', getScoreColor(value))}>
                              {value.toFixed(0)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">/ 100</span>
                            <p className="text-xs text-muted-foreground mt-1">Weight: {info.weight}</p>
                          </div>
                        </div>
                        <Progress 
                          value={value} 
                          className={cn('h-2', getProgressColor(value))} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Score History</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-muted-foreground">Loading history...</p>
                    </div>
                  ) : historicalData.length > 0 ? (
                    <TrustScoreChart data={historicalData} currentScore={score} />
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-muted-foreground">No historical data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="improve" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendations.map((rec, index) => {
                    const Icon = rec.icon;
                    return (
                      <div 
                        key={index}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border',
                          rec.type === 'warning' && 'bg-yellow-50 border-yellow-200',
                          rec.type === 'info' && 'bg-blue-50 border-blue-200',
                          rec.type === 'success' && 'bg-green-50 border-green-200'
                        )}
                      >
                        <Icon className={cn(
                          'w-5 h-5 mt-0.5',
                          rec.type === 'warning' && 'text-yellow-600',
                          rec.type === 'info' && 'text-blue-600',
                          rec.type === 'success' && 'text-green-600'
                        )} />
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrustScoreModal;