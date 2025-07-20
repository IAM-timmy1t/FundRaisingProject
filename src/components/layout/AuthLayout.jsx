import React from 'react';
import { Outlet } from 'react-router-dom';
import { Card } from '@/components/ui/card';

/**
 * Layout component for authentication pages
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <Card className="p-6 sm:p-8">
          <Outlet />
        </Card>
      </div>
    </div>
  );
};

export default AuthLayout;