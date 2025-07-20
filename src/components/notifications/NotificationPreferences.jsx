import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Moon, 
  Clock,
  Check,
  X,
  Loader2,
  Info,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationService } from '../../services/notificationService';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState(notificationService.getDefaultPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPushSupport();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.loadUserPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    const supported = 'PushManager' in window && 'serviceWorker' in navigator;
    setPushSupported(supported);
    if (supported && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationService.updatePreferences(preferences);
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePushPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setPushPermission('granted');
    } else {
      setPushPermission('denied');
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const notificationTypes = [
    {
      id: 'donations',
      title: 'New Donations',
      description: 'Get notified when someone donates to your campaigns',
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'updates',
      title: 'Campaign Updates',
      description: 'Receive notifications for campaign updates you follow',
      icon: <Info className="w-5 h-5" />
    },
    {
      id: 'goal_reached',
      title: 'Goal Reached',
      description: 'Celebrate when campaigns reach their funding goals',
      icon: <Check className="w-5 h-5" />
    },
    {
      id: 'campaign_ending',
      title: 'Campaign Ending Soon',
      description: 'Reminders for campaigns ending within 24 hours',
      icon: <Clock className="w-5 h-5" />
    },
    {
      id: 'trust_changes',
      title: 'Trust Score Changes',
      description: 'Updates about your trust score modifications',
      icon: <AlertCircle className="w-5 h-5" />
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-gray-600">
          Manage how you receive updates about campaigns and donations
        </p>
      </motion.div>

      {/* Push Notification Permission */}
      {pushSupported && pushPermission !== 'granted' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Smartphone className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Enable Push Notifications
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Get instant updates even when you're not on the site
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handlePushPermission}
                  disabled={pushPermission === 'denied'}
                  variant={pushPermission === 'denied' ? 'outline' : 'primary'}
                >
                  {pushPermission === 'denied' ? 'Permission Denied' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Notification Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Notification Types</h2>
            <p className="text-sm text-gray-600">
              Choose what you want to be notified about
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {notificationTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg mt-1">
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{type.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {type.description}
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          Email Notifications
                        </label>
                        <Switch
                          checked={preferences[`email_${type.id}`]}
                          onChange={(checked) => 
                            updatePreference(`email_${type.id}`, checked)
                          }
                        />
                      </div>
                      {pushSupported && pushPermission === 'granted' && (
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm">
                            <Smartphone className="w-4 h-4 text-gray-500" />
                            Push Notifications
                          </label>
                          <Switch
                            checked={preferences[`push_${type.id}`]}
                            onChange={(checked) => 
                              updatePreference(`push_${type.id}`, checked)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Digest Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Email Digest</h2>
            <p className="text-sm text-gray-600">
              How often should we send you email summaries?
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['instant', 'daily', 'weekly', 'never'].map((option) => (
                <button
                  key={option}
                  onClick={() => updatePreference('email_digest', option)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    preferences.email_digest === option
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium capitalize">{option}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {option === 'instant' && 'As they happen'}
                      {option === 'daily' && 'Once per day'}
                      {option === 'weekly' && 'Once per week'}
                      {option === 'never' && 'No digests'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quiet Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Quiet Hours</h2>
                <p className="text-sm text-gray-600">
                  Pause push notifications during specific hours
                </p>
              </div>
              <Switch
                checked={preferences.quiet_hours_enabled}
                onChange={(checked) => 
                  updatePreference('quiet_hours_enabled', checked)
                }
              />
            </div>
          </CardHeader>
          {preferences.quiet_hours_enabled && (
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) => 
                      updatePreference('quiet_hours_start', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) => 
                      updatePreference('quiet_hours_end', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Moon className="w-4 h-4" />
                <span>
                  Push notifications will be paused from{' '}
                  {preferences.quiet_hours_start} to {preferences.quiet_hours_end}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex justify-end"
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="min-w-[200px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default NotificationPreferences;