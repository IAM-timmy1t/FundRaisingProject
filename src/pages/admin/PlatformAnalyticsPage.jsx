import React from 'react';
import PlatformAnalyticsDashboard from '@/components/analytics/PlatformAnalyticsDashboard';
import AdminLayout from '@/components/layout/AdminLayout';

const PlatformAnalyticsPage = () => {
  return (
    <AdminLayout>
      <PlatformAnalyticsDashboard />
    </AdminLayout>
  );
};

export default PlatformAnalyticsPage;
