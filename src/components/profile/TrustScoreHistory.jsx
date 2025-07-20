import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Calendar,
  Activity,
  ChevronRight,
  Clock,
  Star,
  Shield,
  Heart,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import userProfileService from '@/lib/userProfileService';
import { cn } from '@/lib/utils';

const TrustScoreHistory = ({ userId, currentScore, currentTier }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year, all
  const [viewMode, setViewMode] = useState('chart'); // chart, timeline, metrics

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await userProfileService.getTrustScoreHistory(userId, 100);
      if (error) throw error;
      
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching trust score history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        return history;
    }

    return history.filter(event => new Date(event.created_at) >= startDate);
  };

  const getChartData = () => {
    const filtered = getFilteredData();
    const sorted = [...filtered].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    return sorted.map(event => ({
      date: format(new Date(event.created_at), 'MMM dd'),
      timestamp: new Date(event.created_at).getTime(),
      score: event.new_score,
      change: event.score_change,
      event: event.event_type,
      category: event.metadata?.category || 'general'
    }));
  };

  const getEventIcon = (eventType) => {
    const icons = {
      'campaign_created': <Plus className="w-4 h-4" />,
      'campaign_updated': <Activity className="w-4 h-4" />,
      'donation_received': <Heart className="w-4 h-4" />,
      'donation_made': <Heart className="w-4 h-4" />,
      'verification_completed': <CheckCircle className="w-4 h-4" />,
      'update_posted': <MessageSquare className="w-4 h-4" />,
      'milestone_reached': <Award className="w-4 h-4" />,
      'violation_reported': <AlertCircle className="w-4 h-4" />,
      'time_penalty': <Clock className="w-4 h-4" />,
    };
    return icons[eventType] || <Activity className="w-4 h-4" />;
  };

  const getEventColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const calculateMetrics = () => {
    const filtered = getFilteredData();
    
    const totalChange = filtered.reduce((sum, event) => sum + event.score_change, 0);
    const positiveEvents = filtered.filter(e => e.score_change > 0).length;
    const negativeEvents = filtered.filter(e => e.score_change < 0).length;
    const avgChange = filtered.length > 0 ? totalChange / filtered.length : 0;

    const categoryBreakdown = filtered.reduce((acc, event) => {
      const category = event.metadata?.category || 'general';
      if (!acc[category]) {
        acc[category] = { count: 0, totalChange: 0 };
      }
      acc[category].count++;
      acc[category].totalChange += event.score_change;
      return acc;
    }, {});

    return {
      totalChange,
      positiveEvents,
      negativeEvents,
      avgChange,
      eventCount: filtered.length,
      categoryBreakdown
    };
  };

  const metrics = calculateMetrics();
  const chartData = getChartData();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Trust Score History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Score: {currentScore?.toFixed(1) || '50.0'}
            </Badge>
            <Badge className={cn(
              currentTier === 'STAR' && 'bg-yellow-500',
              currentTier === 'TRUSTED' && 'bg-purple-500',
              currentTier === 'STEADY' && 'bg-green-500',
              currentTier === 'RISING' && 'bg-blue-500',
              currentTier === 'NEW' && 'bg-gray-500'
            )}>
              {currentTier}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2">
          {['week', 'month', 'year', 'all'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              Last {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Total Change</p>
                <p className={cn(
                  "text-2xl font-bold",
                  metrics.totalChange > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metrics.totalChange > 0 ? '+' : ''}{metrics.totalChange.toFixed(1)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Positive Events</p>
                <p className="text-2xl font-bold text-green-600">{metrics.positiveEvents}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Negative Events</p>
                <p className="text-2xl font-bold text-red-600">{metrics.negativeEvents}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Avg Change</p>
                <p className="text-2xl font-bold">{metrics.avgChange.toFixed(2)}</p>
              </div>
            </div>

            {/* Score Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-sm">Score: {data.score.toFixed(1)}</p>
                            <p className={cn(
                              "text-sm",
                              data.change > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              Change: {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {data.event.replace(/_/g, ' ')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-3">Impact by Category</h4>
              <div className="space-y-2">
                {Object.entries(metrics.categoryBreakdown).map(([category, data]) => {
                  const percentage = (Math.abs(data.totalChange) / Math.abs(metrics.totalChange) * 100) || 0;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="w-24 text-sm capitalize">
                        {category.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              data.totalChange > 0 ? "bg-green-500" : "bg-red-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground w-16 text-right">
                        {data.totalChange > 0 ? '+' : ''}{data.totalChange.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-2">
            <div className="max-h-96 overflow-y-auto pr-2">
              {getFilteredData().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events in this time period
                </div>
              ) : (
                getFilteredData()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((event, index) => (
                    <div 
                      key={event.id || index} 
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        event.score_change > 0 ? "bg-green-100" : "bg-red-100"
                      )}>
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium capitalize">
                            {event.event_type.replace(/_/g, ' ')}
                          </p>
                          <span className={cn(
                            "text-sm font-medium",
                            getEventColor(event.score_change)
                          )}>
                            {event.score_change > 0 ? '+' : ''}{event.score_change.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.description || `Trust score ${event.score_change > 0 ? 'increased' : 'decreased'}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {/* Event Type Distribution */}
            <div>
              <h4 className="text-sm font-medium mb-3">Event Distribution</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(
                  getFilteredData().reduce((acc, event) => {
                    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getEventIcon(type)}
                      <span className="text-sm capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Score Milestones */}
            <div>
              <h4 className="text-sm font-medium mb-3">Milestones Reached</h4>
              <div className="space-y-2">
                {[
                  { score: 30, tier: 'RISING', icon: <TrendingUp className="w-4 h-4" /> },
                  { score: 50, tier: 'STEADY', icon: <Shield className="w-4 h-4" /> },
                  { score: 70, tier: 'TRUSTED', icon: <Award className="w-4 h-4" /> },
                  { score: 90, tier: 'STAR', icon: <Star className="w-4 h-4" /> },
                ].map((milestone) => {
                  const reached = currentScore >= milestone.score;
                  return (
                    <div 
                      key={milestone.tier}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        reached ? "bg-primary/10 border-primary" : "bg-muted/30 border-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          reached ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {milestone.icon}
                        </div>
                        <div>
                          <p className="font-medium">{milestone.tier} Tier</p>
                          <p className="text-sm text-muted-foreground">
                            Score ≥ {milestone.score}
                          </p>
                        </div>
                      </div>
                      {reached && <CheckCircle className="w-5 h-5 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TrustScoreHistory;