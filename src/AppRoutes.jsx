import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAppLogic } from '@/hooks/useAppLogic';
import MainLayout from '@/components/layout/MainLayout';
import PaymentPage from '@/components/views/PaymentPage';
import PaymentSuccessPage from '@/components/views/PaymentSuccessPage';
import PaymentFailurePage from '@/components/views/PaymentFailurePage';
import ProfilePage from '@/components/views/ProfilePage';
import SupportView from '@/components/views/SupportView';
import PrivacyPolicyPage from '@/components/views/PrivacyPolicyPage';
import TermsOfServicePage from '@/components/views/TermsOfServicePage';
import DonationDisclaimerPage from '@/components/views/DonationDisclaimerPage';
import MessagesView from '@/components/views/MessagesView';
import AdminDashboard from '@/components/views/AdminDashboard';
import AdminModerationPage from '@/pages/admin/AdminModerationPage';
import CampaignCreationWizard from '@/components/campaigns/CampaignCreationWizard';
import CampaignTestPage from '@/components/views/CampaignTestPage';
import CampaignsPage from '@/components/views/CampaignsPage';
import CampaignDetailPage from '@/components/views/CampaignDetailPageEnhanced';
import CampaignUpdateManager from '@/components/campaigns/CampaignUpdateManager';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import CampaignManagement from '@/components/campaigns/CampaignManagement';
import CampaignEmbedPage from '@/components/views/CampaignEmbedPage';
import SearchPage from '@/components/views/SearchPage';
import DonorDashboardPage from '@/pages/donor/DonorDashboardPage';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users, Info } from 'lucide-react';

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, stories, communityPosts, handlers } = useAppLogic();

  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/about')) return 'about';
    return 'home';
  };
  
  const activeTab = getActiveTabFromPath();

  const handleTabChange = (value) => {
    switch (value) {
      case 'home':
        navigate('/');
        break;
      case 'community':
        navigate('/community');
        break;
      case 'about':
        navigate('/about');
        break;
      default:
        navigate('/');
    }
  };

  const showTabs = !location.pathname.startsWith('/admin') && ['/', '/community', '/about'].some(path => location.pathname.startsWith(path));

  return (
    <>
      {showTabs && (
        <div className="flex justify-center items-center my-4 sticky top-28 z-30">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList className="bg-white/10 border border-white/20 p-1 rounded-full backdrop-blur-sm">
              <TabsTrigger value="home" className="data-[state=active]:bg-white/10 data-[state=active]:text-white"><Home className="w-4 h-4 mr-2" />Home</TabsTrigger>
              <TabsTrigger value="community" className="data-[state=active]:bg-white/10 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2" />Community</TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:bg-white/10 data-[state=active]:text-white"><Info className="w-4 h-4 mr-2" />About Us</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <main className="flex-grow pb-20"> {/* Add padding-bottom to avoid overlap with chat bar */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/*" element={
              <MainLayout 
                stories={stories}
                communityPosts={communityPosts}
                user={user}
                onShareStoryClick={handlers.handleShareStoryClick}
                onPostToCommunity={handlers.handlePostToCommunity}
                onLikePost={handlers.handleLikePost}
                onLoginClick={handlers.handleLoginClick}
                onSendMessage={handlers.handleSendMessage}
                onDeletePost={handlers.handleDeletePost}
              />
            } />
            <Route path="/payment/:campaignId" element={
              <PaymentPage />
            } />
            <Route path="/payment/success" element={
              <PaymentSuccessPage />
            } />
            <Route path="/payment/failure" element={
              <PaymentFailurePage />
            } />
            <Route path="/profile" element={
              <ProfilePage
                onShareStoryClick={handlers.handleShareStoryClick}
                onDonateClick={handlers.handleDonateClick}
              />
            } />
            <Route path="/donor/dashboard" element={<DonorDashboardPage />} />
            <Route path="/messages" element={<MessagesView />} />
            <Route path="/messages/:conversationId" element={<MessagesView />} />
            <Route path="/support" element={<SupportView />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/donation-disclaimer" element={<DonationDisclaimerPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/manage" element={<CampaignManagement />} />
            <Route path="/campaigns/create" element={<CampaignCreationWizard />} />
            <Route path="/campaigns/test" element={<CampaignTestPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/campaigns/:id/updates" element={<CampaignUpdateManager />} />
            <Route path="/campaigns/:campaignId/analytics" element={<AnalyticsDashboard />} />
            <Route path="/embed/campaign" element={<CampaignEmbedPage />} />
            <Route path="/search" element={<SearchPage />} />
             {profile?.role === 'admin' && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/moderation" element={<AdminModerationPage />} />
              </>
            )}
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
};

export default AppRoutes;