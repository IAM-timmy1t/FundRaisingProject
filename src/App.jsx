import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { EnhancedAuthProvider } from './contexts/EnhancedAuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { notificationService } from './services/notificationService';
import PerformanceMonitor from './components/PerformanceMonitor';

// Auth pages
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';

// Dashboard pages
import Dashboard from './components/dashboard/Dashboard';
import ProfilePage from './components/profile/ProfilePage';
import CampaignListPage from './components/views/CampaignListPage';
import CampaignDetailPageRealtime from './components/views/CampaignDetailPageRealtime';
import CreateCampaignPage from './components/campaigns/CreateCampaignPage';
import PaymentSuccessPage from './components/payment/PaymentSuccessPage';
import PaymentCancelPage from './components/payment/PaymentCancelPage';
import NotificationPreferences from './components/notifications/NotificationPreferences';
import NotificationsPage from './components/notifications/NotificationsPage';
import CampaignAnalyticsList from './components/analytics/CampaignAnalyticsList';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

// Admin pages
import AdminModerationPage from './pages/admin/AdminModerationPage';
import PlatformAnalyticsPage from './pages/admin/PlatformAnalyticsPage';

// GDPR components
import CookieConsentBanner from './components/gdpr/CookieConsentBanner';
import GDPRPrivacyPolicy from './components/gdpr/GDPRPrivacyPolicy';
import CookiePolicy from './components/gdpr/CookiePolicy';
import UserRightsManagement from './components/gdpr/UserRightsManagement';

// Landing page
import LandingPage from './components/landing/LandingPage';

// Developer Portal
import DeveloperPortal from './components/views/DeveloperPortal';

function App() {
  useEffect(() => {
    // Initialize notification service
    notificationService.initialize().catch(console.error);

    // Handle notification clicks from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-click') {
          window.location.href = event.data.url;
        }
      });
    }
  }, []);
  return (
    <EnhancedAuthProvider>
      <PerformanceMonitor />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy-policy" element={<GDPRPrivacyPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/developers" element={<DeveloperPortal />} />
        
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route path="/campaigns/create" element={<CreateCampaignPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPageRealtime />} />
          <Route path="/analytics" element={<CampaignAnalyticsList />} />
          <Route path="/analytics/:campaignId" element={<AnalyticsDashboard />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferences />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/account/privacy" element={<UserRightsManagement />} />
          
          {/* Admin routes */}
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/admin/analytics" element={<PlatformAnalyticsPage />} />
        </Route>
      </Routes>
      
      <CookieConsentBanner />
      
      <Toaster 
        position="top-center"
        richColors
        closeButton
        duration={5000}
      />
    </EnhancedAuthProvider>
  );
}

export default App;