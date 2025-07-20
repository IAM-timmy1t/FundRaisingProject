import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { notificationService } from '../../services/notificationService';
import { supabase } from '../../config/supabase';

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [preferences, setPreferences] = useState(notificationService.getDefaultPreferences());

  useEffect(() => {
    loadSettings();
    checkPushPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const prefs = await notificationService.loadUserPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  };

  const handleEnablePush = async () => {
    const granted = await notificationService.requestPermission();
    setPushEnabled(granted);
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await notificationService.updatePreferences(preferences);
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    if (!pushEnabled) {
      toast.error('Please enable push notifications first');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await notificationService.sendPushNotification(user.id, {
        type: 'test',
        title: 'Test Notification',
        body: 'This is a test notification from your settings',
        icon: '/icon-192x192.png'
      });
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get instant notifications in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushEnabled ? (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Enable Browser Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive real-time updates about your campaigns
                </p>
              </div>
              <Button onClick={handleEnablePush}>
                Enable Notifications
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Bell className="h-5 w-5" />
                <span>Push notifications enabled</span>
              </div>
              <Button variant="outline" size="sm" onClick={testNotification}>
                Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Digest Settings */}
          <div className="space-y-2">
            <Label htmlFor="email-digest">Email Frequency</Label>
            <Select
              value={preferences.email_digest}
              onValueChange={(value) => handlePreferenceChange('email_digest', value)}
            >
              <SelectTrigger id="email-digest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (as they happen)</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Email Notification Types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Email me about:</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-donations" className="flex flex-col">
                  <span>New Donations</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    When someone donates to your campaigns
                  </span>
                </Label>
                <Switch
                  id="email-donations"
                  checked={preferences.email_donations}
                  onCheckedChange={(checked) => handlePreferenceChange('email_donations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-updates" className="flex flex-col">
                  <span>Campaign Updates</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Updates from campaigns you follow
                  </span>
                </Label>
                <Switch
                  id="email-updates"
                  checked={preferences.email_updates}
                  onCheckedChange={(checked) => handlePreferenceChange('email_updates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-goal" className="flex flex-col">
                  <span>Goal Reached</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    When your campaign reaches its goal
                  </span>
                </Label>
                <Switch
                  id="email-goal"
                  checked={preferences.email_goal_reached}
                  onCheckedChange={(checked) => handlePreferenceChange('email_goal_reached', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-ending" className="flex flex-col">
                  <span>Campaign Ending Soon</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Reminders before campaigns end
                  </span>
                </Label>
                <Switch
                  id="email-ending"
                  checked={preferences.email_campaign_ending}
                  onCheckedChange={(checked) => handlePreferenceChange('email_campaign_ending', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-trust" className="flex flex-col">
                  <span>Trust Score Changes</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Updates about your trust score
                  </span>
                </Label>
                <Switch
                  id="email-trust"
                  checked={preferences.email_trust_changes}
                  onCheckedChange={(checked) => handlePreferenceChange('email_trust_changes', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notification Types */}
      {pushEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Push Notification Types</CardTitle>
            <CardDescription>
              Choose which push notifications to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-donations" className="flex flex-col">
                  <span>New Donations</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Instant alerts for new donations
                  </span>
                </Label>
                <Switch
                  id="push-donations"
                  checked={preferences.push_donations}
                  onCheckedChange={(checked) => handlePreferenceChange('push_donations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-updates" className="flex flex-col">
                  <span>Campaign Updates</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    New updates from followed campaigns
                  </span>
                </Label>
                <Switch
                  id="push-updates"
                  checked={preferences.push_updates}
                  onCheckedChange={(checked) => handlePreferenceChange('push_updates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-goal" className="flex flex-col">
                  <span>Goal Reached</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Celebrate when goals are met
                  </span>
                </Label>
                <Switch
                  id="push-goal"
                  checked={preferences.push_goal_reached}
                  onCheckedChange={(checked) => handlePreferenceChange('push_goal_reached', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-ending" className="flex flex-col">
                  <span>Campaign Ending Soon</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Last chance reminders
                  </span>
                </Label>
                <Switch
                  id="push-ending"
                  checked={preferences.push_campaign_ending}
                  onCheckedChange={(checked) => handlePreferenceChange('push_campaign_ending', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-trust" className="flex flex-col">
                  <span>Trust Score Changes</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Trust score updates
                  </span>
                </Label>
                <Switch
                  id="push-trust"
                  checked={preferences.push_trust_changes}
                  onCheckedChange={(checked) => handlePreferenceChange('push_trust_changes', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause push notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours" className="flex items-center gap-2">
              {preferences.quiet_hours_enabled ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span>Enable Quiet Hours</span>
            </Label>
            <Switch
              id="quiet-hours"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSavePreferences} 
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}