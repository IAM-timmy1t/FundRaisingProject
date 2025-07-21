import React from 'react';
import RecipientDashboard from '@/components/recipient/RecipientDashboard';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const RecipientDashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Shield className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Recipient Dashboard</h1>
              <p className="text-primary-100 mt-1">
                Manage your campaigns and track your impact
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <RecipientDashboard />
      </div>
    </div>
  );
};

export default RecipientDashboardPage;