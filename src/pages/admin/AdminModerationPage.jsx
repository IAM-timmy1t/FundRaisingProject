import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAppLogic } from '@/hooks/useAppLogic';
import ModerationQueue from '@/components/admin/moderation/ModerationQueue';
import CampaignDetail from '@/components/admin/moderation/CampaignDetail';
import ModerationHistory from '@/components/admin/moderation/ModerationHistory';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sparkles,
  Users,
  FileText,
  DollarSign,
  Activity
} from 'lucide-react';

const StatCard = ({ title, value, icon, color, trend }) => (
  <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-blue-200">{title}</CardTitle>
      {React.cloneElement(icon, { className: `h-4 w-4 text-${color}-400` })}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className="text-xs text-green-400 mt-1 flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

const AdminModerationPage = () => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved_today: 0,
    rejected_today: 0,
    average_score: 0,
    average_processing_time: 0,
    total_campaigns: 0,
    approval_rate: 0,
    top_flags: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAppLogic();

  // Check admin access
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      window.location.href = '/';
    }
  }, [profile]);

  // Fetch moderation statistics
  const fetchStats = async () => {
    try {
      // Get pending campaigns count
      const { count: pendingCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review');

      // Get today's moderation activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayActivity } = await supabase
        .from('campaign_moderation')
        .select('decision, moderation_score, processing_time, flags')
        .gte('moderated_at', today.toISOString());

      const approved = todayActivity?.filter(m => m.decision === 'approved').length || 0;
      const rejected = todayActivity?.filter(m => m.decision === 'rejected').length || 0;
      
      // Calculate average score and processing time
      const scores = todayActivity?.map(m => m.moderation_score) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      const processingTimes = todayActivity?.map(m => m.processing_time).filter(t => t > 0) || [];
      const avgTime = processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;

      // Get total campaigns and approval rate
      const { count: totalCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      const { count: approvedTotal } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const approvalRate = totalCount > 0 ? (approvedTotal / totalCount) * 100 : 0;

      // Aggregate flags
      const allFlags = todayActivity?.flatMap(m => m.flags || []) || [];
      const flagCounts = allFlags.reduce((acc, flag) => {
        acc[flag] = (acc[flag] || 0) + 1;
        return acc;
      }, {});
      
      const topFlags = Object.entries(flagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([flag, count]) => ({ flag, count }));

      setStats({
        pending: pendingCount || 0,
        approved_today: approved,
        rejected_today: rejected,
        average_score: Math.round(avgScore),
        average_processing_time: Math.round(avgTime),
        total_campaigns: totalCount || 0,
        approval_rate: Math.round(approvalRate),
        top_flags: topFlags
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load moderation statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Set up real-time subscription for stats updates
    const subscription = supabase
      .channel('moderation_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCampaignDecision = () => {
    setSelectedCampaign(null);
    fetchStats();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto py-8 px-4"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="w-10 h-10 text-cyan-400" />
          Campaign Moderation
        </h1>
        <p className="text-blue-200">Review and moderate campaign submissions to ensure quality and authenticity</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="Approved Today"
          value={stats.approved_today}
          icon={<CheckCircle />}
          color="green"
          trend={`${stats.approval_rate}% approval rate`}
        />
        <StatCard
          title="Rejected Today"
          value={stats.rejected_today}
          icon={<XCircle />}
          color="red"
        />
        <StatCard
          title="Average Score"
          value={`${stats.average_score}/100`}
          icon={<Sparkles />}
          color="purple"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Processing Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average_processing_time}ms</div>
            <p className="text-xs text-gray-400 mt-1">Average AI processing time</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_campaigns}</div>
            <p className="text-xs text-gray-400 mt-1">All time submissions</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_flags.length > 0 ? (
              <div className="space-y-1">
                {stats.top_flags.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span className="text-red-300 truncate">{item.flag}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No flags today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Interface */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-black/20 border-white/20">
          <TabsTrigger value="queue" className="data-[state=active]:bg-white/10">
            <Clock className="h-4 w-4 mr-2" />
            Review Queue ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white/10">
            <FileText className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <ModerationQueue onSelectCampaign={setSelectedCampaign} />
        </TabsContent>

        <TabsContent value="history">
          <ModerationHistory onSelectCampaign={setSelectedCampaign} />
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Moderation Analytics</CardTitle>
              <CardDescription className="text-blue-200">
                Detailed insights into moderation patterns and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  Advanced analytics dashboard coming soon. This will include trend analysis, 
                  admin performance metrics, and predictive insights.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onDecision={handleCampaignDecision}
        />
      )}
    </motion.div>
  );
};

export default AdminModerationPage;
