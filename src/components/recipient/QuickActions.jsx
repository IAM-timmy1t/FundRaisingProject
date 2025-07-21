import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus,
  MessageSquare,
  Download,
  Users,
  Share2,
  FileText,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const QuickActions = ({ userId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    {
      id: 'create-campaign',
      label: t('quickActions.createCampaign', 'Create Campaign'),
      sublabel: t('quickActions.startFundraising', 'Start fundraising'),
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => navigate('/campaigns/create')
    },
    {
      id: 'post-update',
      label: t('quickActions.postUpdate', 'Post Update'),
      sublabel: t('quickActions.updateDonors', 'Update all donors'),
      icon: MessageSquare,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => navigate('/updates/new')
    },
    {
      id: 'download-receipts',
      label: t('quickActions.downloadReceipts', 'Tax Receipts'),
      sublabel: t('quickActions.exportDocuments', 'Export documents'),
      icon: Download,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => navigate('/receipts')
    },
    {
      id: 'manage-donors',
      label: t('quickActions.manageDonors', 'Donor List'),
      sublabel: t('quickActions.viewContacts', 'View contacts'),
      icon: Users,
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => navigate('/donors')
    },
    {
      id: 'share-campaigns',
      label: t('quickActions.share', 'Share'),
      sublabel: t('quickActions.socialMedia', 'Social media'),
      icon: Share2,
      color: 'bg-pink-500 hover:bg-pink-600',
      onClick: () => navigate('/share')
    },
    {
      id: 'view-reports',
      label: t('quickActions.reports', 'Reports'),
      sublabel: t('quickActions.analytics', 'View analytics'),
      icon: FileText,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      onClick: () => navigate('/reports')
    },
    {
      id: 'settings',
      label: t('quickActions.settings', 'Settings'),
      sublabel: t('quickActions.account', 'Account settings'),
      icon: Settings,
      color: 'bg-gray-500 hover:bg-gray-600',
      onClick: () => navigate('/settings')
    },
    {
      id: 'help',
      label: t('quickActions.help', 'Help'),
      sublabel: t('quickActions.support', 'Get support'),
      icon: HelpCircle,
      color: 'bg-teal-500 hover:bg-teal-600',
      onClick: () => navigate('/help')
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('quickActions.title', 'Quick Actions')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="ghost"
                className="h-auto flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all duration-200 group w-full"
                onClick={action.onClick}
              >
                <div className={`p-3 rounded-full ${action.color} text-white mb-2 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
                <span className="text-xs text-gray-500">{action.sublabel}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;