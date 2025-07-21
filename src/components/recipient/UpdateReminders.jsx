import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { formatDate, getRelativeTime } from '@/lib/utils';
import { campaignService } from '@/lib/campaignService';

const UpdateReminders = ({ campaigns }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [overdueUpdates, setOverdueUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeUpdateStatus();
  }, [campaigns]);

  const analyzeUpdateStatus = () => {
    try {
      const now = new Date();
      const remindersList = [];
      const overdueList = [];

      campaigns.forEach(campaign => {
        if (campaign.status !== 'active' && campaign.status !== 'approved') return;

        const lastUpdate = campaign.last_update_date ? new Date(campaign.last_update_date) : new Date(campaign.created_at);
        const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

        // Determine update frequency based on campaign activity
        const donorCount = campaign.donor_count || 0;
        let recommendedFrequency = 7; // Default to weekly
        
        if (donorCount > 50) {
          recommendedFrequency = 3; // Every 3 days for highly active campaigns
        } else if (donorCount > 20) {
          recommendedFrequency = 5; // Every 5 days for moderately active campaigns
        }

        if (daysSinceUpdate >= recommendedFrequency) {
          const reminder = {
            id: campaign.id,
            campaignTitle: campaign.title,
            lastUpdate: lastUpdate,
            daysSinceUpdate,
            recommendedFrequency,
            donorCount,
            isOverdue: daysSinceUpdate >= recommendedFrequency * 2,
            priority: daysSinceUpdate >= recommendedFrequency * 2 ? 'high' : 'medium'
          };

          if (reminder.isOverdue) {
            overdueList.push(reminder);
          } else {
            remindersList.push(reminder);
          }
        }
      });

      // Sort by days since update (most overdue first)
      overdueList.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
      remindersList.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

      setOverdueUpdates(overdueList);
      setReminders(remindersList);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const config = {
      high: { variant: 'destructive', label: 'High Priority' },
      medium: { variant: 'warning', label: 'Medium Priority' },
      low: { variant: 'secondary', label: 'Low Priority' }
    };

    const { variant, label } = config[priority] || config.medium;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getUpdateSuggestion = (campaign) => {
    const suggestions = [
      'Share a photo of recent progress',
      'Thank your recent donors by name',
      'Explain how the funds are being used',
      'Share a story about someone you\'ve helped',
      'Post a video update showing your work',
      'Provide a breakdown of expenses so far',
      'Share challenges you\'re facing',
      'Celebrate a milestone achievement'
    ];

    // Use campaign ID to consistently select a suggestion
    const index = parseInt(campaign.id.slice(-1), 16) % suggestions.length;
    return suggestions[index];
  };

  const handlePostUpdate = (campaignId) => {
    navigate(`/campaigns/${campaignId}/update`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Clock className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const allReminders = [...overdueUpdates, ...reminders];

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {overdueUpdates.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{overdueUpdates.length} campaign{overdueUpdates.length > 1 ? 's' : ''}</strong> {overdueUpdates.length > 1 ? 'are' : 'is'} overdue for an update. 
            Regular updates help maintain donor trust and engagement.
          </AlertDescription>
        </Alert>
      )}

      {/* Update Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('updates.schedule', 'Update Schedule')}
          </CardTitle>
          <CardDescription>
            {t('updates.scheduleDesc', 'Keep your donors engaged with regular campaign updates')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allReminders.length > 0 ? (
            <div className="space-y-4">
              {allReminders.map((reminder, index) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${reminder.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{reminder.campaignTitle}</h4>
                        {getPriorityBadge(reminder.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last updated {reminder.daysSinceUpdate} days ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {reminder.donorCount} donors
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        <strong>Suggestion:</strong> {getUpdateSuggestion(reminder)}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handlePostUpdate(reminder.id)}
                      variant={reminder.isOverdue ? 'destructive' : 'default'}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Post Update
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('updates.allUpToDate', 'All campaigns are up to date!')}
              </h3>
              <p className="text-gray-600">
                {t('updates.greatJob', 'Great job keeping your donors informed.')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>{t('updates.bestPractices', 'Update Best Practices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Frequency Guidelines
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  New campaigns: Update every 3-5 days
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  Active campaigns: Weekly updates minimum
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  Major milestones: Update immediately
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Content Tips
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Include photos or videos when possible
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Be specific about fund usage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Thank donors and show appreciation
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateReminders;