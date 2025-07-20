import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Mail, Smartphone, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notificationService';
import { toast } from 'sonner';

const NotificationSettings = () => {
  const {
    preferences,
    permissionState,
    requestPermission,
    sendTestNotification
  } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(null);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleEnablePushNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Push notifications enabled!');
      }
    } catch (error) {
      toast.error('Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    setUpdating(true);
    try {
      await notificationService.updatePreferences(localPreferences);
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  if (!localPreferences) {
    return <div className="animate-pulse">Loading preferences...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive updates about your campaigns and donations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Push Notification Permission */}
        {permissionState !== 'granted' && (
          <Alert className="mb-6">
            <BellOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Push notifications are currently disabled</span>
              <Button
                onClick={handleEnablePushNotifications}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                {loading ? 'Enabling...' : 'Enable Push Notifications'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {permissionState === 'granted' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Bell className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between text-green-700">
              <span>Push notifications are enabled</span>
              <Button
                onClick={handleSendTestNotification}
                size="sm"
                variant="outline"
                className="border-green-300 hover:bg-green-100"
              >
                Send Test Notification
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Mail className="h-4 w-4 mr-2" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="quiet">
              <Clock className="h-4 w-4 mr-2" />
              Quiet Hours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Email Notifications</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-donations" className="flex flex-col">
                    <span>New Donations</span>
                    <span className="text-xs text-muted-foreground">
                      Get notified when someone donates to your campaign
                    </span>
                  </Label>
                  <Switch
                    id="email-donations"
                    checked={localPreferences.email_donations}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('email_donations', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-updates" className="flex flex-col">
                    <span>Campaign Updates</span>
                    <span className="text-xs text-muted-foreground">
                      Receive updates from campaigns you've donated to
                    </span>
                  </Label>
                  <Switch
                    id="email-updates"
                    checked={localPreferences.email_updates}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('email_updates', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-goal" className="flex flex-col">
                    <span>Goal Reached</span>
                    <span className="text-xs text-muted-foreground">
                      Celebrate when campaigns reach their funding goal
                    </span>
                  </Label>
                  <Switch
                    id="email-goal"
                    checked={localPreferences.email_goal_reached}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('email_goal_reached', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-ending" className="flex flex-col">
                    <span>Campaign Ending Soon</span>
                    <span className="text-xs text-muted-foreground">
                      Reminders before campaigns you follow end
                    </span>
                  </Label>
                  <Switch
                    id="email-ending"
                    checked={localPreferences.email_campaign_ending}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('email_campaign_ending', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-trust" className="flex flex-col">
                    <span>Trust Score Changes</span>
                    <span className="text-xs text-muted-foreground">
                      Updates about your trust score
                    </span>
                  </Label>
                  <Switch
                    id="email-trust"
                    checked={localPreferences.email_trust_changes}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('email_trust_changes', checked)
                    }
                  />
                </div>
              </div>

              {permissionState === 'granted' && (
                <>
                  <h3 className="text-sm font-medium mt-6">Push Notifications</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-donations" className="flex flex-col">
                        <span>New Donations</span>
                        <span className="text-xs text-muted-foreground">
                          Instant alerts for new donations
                        </span>
                      </Label>
                      <Switch
                        id="push-donations"
                        checked={localPreferences.push_donations}
                        onCheckedChange={(checked) => 
                          handlePreferenceChange('push_donations', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-updates" className="flex flex-col">
                        <span>Campaign Updates</span>
                        <span className="text-xs text-muted-foreground">
                          Real-time campaign update alerts
                        </span>
                      </Label>
                      <Switch
                        id="push-updates"
                        checked={localPreferences.push_updates}
                        onCheckedChange={(checked) => 
                          handlePreferenceChange('push_updates', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-goal" className="flex flex-col">
                        <span>Goal Reached</span>
                        <span className="text-xs text-muted-foreground">
                          Instant celebration notifications
                        </span>
                      </Label>
                      <Switch
                        id="push-goal"
                        checked={localPreferences.push_goal_reached}
                        onCheckedChange={(checked) => 
                          handlePreferenceChange('push_goal_reached', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-ending" className="flex flex-col">
                        <span>Campaign Ending Soon</span>
                        <span className="text-xs text-muted-foreground">
                          Last-minute reminders
                        </span>
                      </Label>
                      <Switch
                        id="push-ending"
                        checked={localPreferences.push_campaign_ending}
                        onCheckedChange={(checked) => 
                          handlePreferenceChange('push_campaign_ending', checked)
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-digest">Email Delivery Frequency</Label>
                <Select
                  value={localPreferences.email_digest}
                  onValueChange={(value) => 
                    handlePreferenceChange('email_digest', value)
                  }
                >
                  <SelectTrigger id="email-digest" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Choose how often you want to receive email notifications
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quiet" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours" className="flex flex-col">
                  <span>Enable Quiet Hours</span>
                  <span className="text-xs text-muted-foreground">
                    Pause push notifications during specific hours
                  </span>
                </Label>
                <Switch
                  id="quiet-hours"
                  checked={localPreferences.quiet_hours_enabled}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('quiet_hours_enabled', checked)
                  }
                />
              </div>

              {localPreferences.quiet_hours_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div>
                    <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                    <input
                      type="time"
                      id="quiet-start"
                      value={localPreferences.quiet_hours_start}
                      onChange={(e) => 
                        handlePreferenceChange('quiet_hours_start', e.target.value)
                      }
                      className="w-full mt-2 px-3 py-2 border border-input rounded-md"
                    />
                  </div>

                  <div>
                    <Label htmlFor="quiet-end">Quiet Hours End</Label>
                    <input
                      type="time"
                      id="quiet-end"
                      value={localPreferences.quiet_hours_end}
                      onChange={(e) => 
                        handlePreferenceChange('quiet_hours_end', e.target.value)
                      }
                      className="w-full mt-2 px-3 py-2 border border-input rounded-md"
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Push notifications will be silenced during these hours
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={savePreferences}
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;