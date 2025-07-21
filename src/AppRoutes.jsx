import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAppLogic } from '@/hooks/useAppLogic';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Critical components loaded immediately
import MainLayout from '@/components/layout/MainLayout';

// Lazy load all other routes for code splitting
const PaymentPage = lazy(() => import('@/components/views/PaymentPage'));
const PaymentSuccessPage = lazy(() => import('@/components/views/PaymentSuccessPage'));
const PaymentFailurePage = lazy(() => import('@/components/views/PaymentFailurePage'));
const ProfilePage = lazy(() => import('@/components/views/ProfilePage'));
const SupportView = lazy(() => import('@/components/views/SupportView'));
const PrivacyPolicyPage = lazy(() => import('@/components/views/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/components/views/TermsOfServicePage'));
const DonationDisclaimerPage = lazy(() => import('@/components/views/DonationDisclaimerPage'));
const MessagesView = lazy(() => import('@/components/views/MessagesView'));
const AdminDashboard = lazy(() => import('@/components/views/AdminDashboard'));
const AdminModerationPage = lazy(() => import('@/pages/admin/AdminModerationPage'));
const CampaignCreationWizard = lazy(() => import('@/components/campaigns/CampaignCreationWizard'));
const CampaignTestPage = lazy(() => import('@/components/views/CampaignTestPage'));
const CampaignsPage = lazy(() => import('@/components/views/CampaignsPage'));
const CampaignDetailPage = lazy(() => import('@/components/views/CampaignDetailPageEnhanced'));
const CampaignUpdateManager = lazy(() => import('@/components/campaigns/CampaignUpdateManager'));
const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard'));
const CampaignManagement = lazy(() => import('@/components/campaigns/CampaignManagement'));
const CampaignEmbedPage = lazy(() => import('@/components/views/CampaignEmbedPage'));
const SearchPage = lazy(() => import('@/components/views/SearchPage'));
const DonorDashboardPage = lazy(() => import('@/pages/donor/DonorDashboardPage'));
const RecipientDashboardPage = lazy(() => import('@/pages/recipient/RecipientDashboardPage'));

// Loading component for better UX during lazy loading
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-4 w-[350px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/recipient/dashboard" element={<RecipientDashboardPage />} />
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
          </Suspense>
        </AnimatePresence>
      </main>
    </>
  );
};

export default AppRoutes;