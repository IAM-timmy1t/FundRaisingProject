// Example: Mobile-Optimized AdminModerationPage Integration
// This shows how to integrate mobile components into existing pages

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useIsMobile } from '@/hooks/useMediaQuery';
import ModerationQueue from '@/components/admin/moderation/ModerationQueue';
import CampaignDetail from '@/components/admin/moderation/CampaignDetail';
import ModerationHistory from '@/components/admin/moderation/ModerationHistory';
import { MobileCampaignCard, MobileFilterBar } from '@/components/admin/moderation/MobileModerationComponents';
import MobileModal from '@/components/ui/mobile-modal';
import ResponsiveTable from '@/components/ui/responsive-table';
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

const StatCard = ({ title, value, icon, color, trend }) => {
  const isMobile = useIsMobile();
  
  return (
    <Card className={`bg-white/10 border-white/20 text-white backdrop-blur-lg ${isMobile ? 'p-3' : ''}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-1' : 'pb-2'}`}>
        <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-blue-200`}>
          {title}
        </CardTitle>
        {React.cloneElement(icon, { className: `h-4 w-4 text-${color}-400` })}
      </CardHeader>
      <CardContent className={isMobile ? 'pt-1' : ''}>
        <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{value}</div>
        {trend && !isMobile && (
          <p className="text-xs text-green-400 mt-1 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const AdminModerationPageMobile = () => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved_today: 0,
    rejected_today: 0,
    avg_review_time: '0h'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // ... existing fetchStats and useEffect code ...

  const handleCampaignDecision = () => {
    setSelectedCampaign(null);
    fetchStats();
  };

  // Mobile-specific tab data
  const tabData = [
    { value: 'queue', label: 'Queue', icon: Clock, count: stats.pending },
    { value: 'history', label: 'History', icon: FileText },
    { value: 'analytics', label: 'Stats', icon: BarChart3 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`container mx-auto ${isMobile ? 'py-4 px-2' : 'py-8 px-4'}`}
    >
      {/* Header - Mobile Optimized */}
      <div className={`${isMobile ? 'mb-4' : 'mb-8'}`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white mb-2 flex items-center gap-3`}>
          <Shield className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-cyan-400`} />
          {!isMobile && 'Campaign'} Moderation
        </h1>
        {!isMobile && (
          <p className="text-blue-200">
            Review and moderate campaign submissions to ensure quality and authenticity
          </p>
        )}
      </div>

      {/* Statistics Overview - Responsive Grid */}
      <div className={`grid gap-${isMobile ? '2' : '4'} grid-cols-2 ${!isMobile && 'md:grid-cols-2 lg:grid-cols-4'} mb-${isMobile ? '4' : '8'}`}>
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="Approved"
          value={stats.approved_today}
          icon={<CheckCircle />}
          color="green"
          trend={!isMobile ? '+12%' : null}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected_today}
          icon={<XCircle />}
          color="red"
        />
        <StatCard
          title="Avg Time"
          value={stats.avg_review_time}
          icon={<Activity />}
          color="blue"
        />
      </div>

      {/* Tabs - Mobile Optimized */}
      {isMobile ? (
        <>
          {/* Mobile Tab Bar */}
          <div className="flex justify-around border-b border-white/20 mb-4">
            {tabData.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                    activeTab === tab.value
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-xs">({tab.count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Tab Content */}
          <div>
            {activeTab === 'queue' && (
              <ModerationQueue onSelectCampaign={setSelectedCampaign} />
            )}
            {activeTab === 'history' && (
              <ModerationHistory onSelectCampaign={setSelectedCampaign} />
            )}
            {activeTab === 'analytics' && (
              <Card className="bg-white/5 border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Total Reviewed</span>
                    <span className="text-white font-medium">
                      {stats.approved_today + stats.rejected_today}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Approval Rate</span>
                    <span className="text-green-400 font-medium">
                      {stats.approved_today > 0 
                        ? Math.round((stats.approved_today / (stats.approved_today + stats.rejected_today)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Alert className="bg-blue-500/10 border-blue-500/30 mt-4">
                    <AlertDescription className="text-sm text-blue-200">
                      Full analytics available on desktop
                    </AlertDescription>
                  </Alert>
                </div>
              </Card>
            )}
          </div>
        </>
      ) : (
        // Desktop Tabs (existing implementation)
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            {/* Existing analytics content */}
          </TabsContent>
        </Tabs>
      )}

      {/* Campaign Detail Modal - Mobile Optimized */}
      {selectedCampaign && (
        isMobile ? (
          <MobileModal
            isOpen={true}
            onClose={() => setSelectedCampaign(null)}
            title="Campaign Review"
            size="full"
          >
            {/* Simplified mobile version of CampaignDetail */}
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{selectedCampaign.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Goal</span>
                    <span>${selectedCampaign.goal_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Category</span>
                    <span>{selectedCampaign.need_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Score</span>
                    <span className="font-bold">
                      {selectedCampaign.campaign_moderation?.[0]?.moderation_score || 0}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Story</h4>
                <p className="text-sm text-gray-300 line-clamp-6">
                  {selectedCampaign.story}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCampaignDecision('approved')}
                  className="flex-1 bg-green-500/20 border-green-500/50 text-green-300"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleCampaignDecision('rejected')}
                  className="flex-1 bg-red-500/20 border-red-500/50 text-red-300"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </MobileModal>
        ) : (
          <CampaignDetail
            campaign={selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
            onDecision={handleCampaignDecision}
          />
        )
      )}
    </motion.div>
  );
};

export default AdminModerationPageMobile;
