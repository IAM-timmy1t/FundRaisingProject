-- Notification system tables
-- Run this after your existing tables

-- Push subscription storage
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  -- Email preferences
  email_donations BOOLEAN DEFAULT true,
  email_updates BOOLEAN DEFAULT true,
  email_goal_reached BOOLEAN DEFAULT true,
  email_campaign_ending BOOLEAN DEFAULT true,
  email_trust_changes BOOLEAN DEFAULT false,
  email_digest TEXT DEFAULT 'daily' CHECK (email_digest IN ('instant', 'daily', 'weekly', 'never')),
  -- Push preferences
  push_donations BOOLEAN DEFAULT true,
  push_updates BOOLEAN DEFAULT true,
  push_goal_reached BOOLEAN DEFAULT true,
  push_campaign_ending BOOLEAN DEFAULT true,
  push_trust_changes BOOLEAN DEFAULT false,
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue for digest emails
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign notification subscriptions (follow specific campaigns)
CREATE TABLE IF NOT EXISTS campaign_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  receive_updates BOOLEAN DEFAULT true,
  receive_donations BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

-- Indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_notification_history_read ON notification_history(read);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_sent ON notification_queue(sent);
CREATE INDEX idx_campaign_subscriptions_campaign ON campaign_subscriptions(campaign_id);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_subscriptions ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view own notification history"
  ON notification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification history"
  ON notification_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Campaign subscriptions policies
CREATE POLICY "Users can manage own campaign subscriptions"
  ON campaign_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view campaign subscribers count"
  ON campaign_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_subscriptions.campaign_id
  ));

-- Functions for notification triggers
CREATE OR REPLACE FUNCTION notify_on_donation()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify campaign creator
  INSERT INTO notification_queue (
    user_id,
    type,
    title,
    body,
    data
  )
  SELECT 
    campaigns.user_id,
    'donations',
    'New Donation!',
    NEW.donor_name || ' donated $' || (NEW.amount / 100)::TEXT || ' to your campaign',
    jsonb_build_object(
      'campaign_id', NEW.campaign_id,
      'donation_id', NEW.id,
      'amount', '$' || (NEW.amount / 100)::TEXT,
      'donor_name', NEW.donor_name,
      'message', NEW.message
    )
  FROM campaigns
  WHERE campaigns.id = NEW.campaign_id;

  -- Notify campaign subscribers
  INSERT INTO notification_queue (
    user_id,
    type,
    title,
    body,
    data
  )
  SELECT 
    cs.user_id,
    'donations',
    'New Donation',
    NEW.donor_name || ' donated to a campaign you follow',
    jsonb_build_object(
      'campaign_id', NEW.campaign_id,
      'donation_id', NEW.id,
      'amount', '$' || (NEW.amount / 100)::TEXT
    )
  FROM campaign_subscriptions cs
  WHERE cs.campaign_id = NEW.campaign_id
    AND cs.receive_donations = true
    AND cs.user_id != (SELECT user_id FROM campaigns WHERE id = NEW.campaign_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for donation notifications
CREATE TRIGGER on_donation_notify
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_donation();

-- Function to check campaign milestones
CREATE OR REPLACE FUNCTION check_campaign_milestones()
RETURNS TRIGGER AS $$
DECLARE
  campaign_record RECORD;
  percentage_complete INTEGER;
BEGIN
  -- Get campaign details
  SELECT * INTO campaign_record
  FROM campaigns
  WHERE id = NEW.campaign_id;

  -- Calculate completion percentage
  percentage_complete := (campaign_record.current_amount * 100) / campaign_record.goal_amount;

  -- Check if goal reached
  IF percentage_complete >= 100 AND OLD.current_amount < campaign_record.goal_amount THEN
    INSERT INTO notification_queue (
      user_id,
      type,
      title,
      body,
      data
    )
    VALUES (
      campaign_record.user_id,
      'goal_reached',
      'Goal Reached! 🎉',
      'Your campaign has reached its funding goal!',
      jsonb_build_object(
        'campaign_id', campaign_record.id,
        'campaign_title', campaign_record.title,
        'goal_amount', '$' || (campaign_record.goal_amount / 100)::TEXT,
        'total_raised', '$' || (campaign_record.current_amount / 100)::TEXT
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for milestone notifications
CREATE TRIGGER on_campaign_milestone_check
  AFTER UPDATE OF current_amount ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_milestones();

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_template, text_template, variables) VALUES
('donation', 'New donation to {{campaign_title}}', 
 '<h2>New Donation Received!</h2><p>{{donor_name}} has donated {{amount}} to your campaign "{{campaign_title}}".</p>',
 '{{donor_name}} has donated {{amount}} to your campaign "{{campaign_title}}".',
 '["campaign_title", "donor_name", "amount", "message"]'::JSONB),
('update', 'New update from {{campaign_title}}',
 '<h2>Campaign Update</h2><h3>{{update_title}}</h3><p>{{update_content}}</p>',
 '{{campaign_title}} posted: {{update_title}} - {{update_content}}',
 '["campaign_title", "update_title", "update_content"]'::JSONB),
('goal_reached', '🎉 {{campaign_title}} reached its goal!',
 '<h2>Congratulations!</h2><p>Your campaign has reached its goal of {{goal_amount}}!</p>',
 'Your campaign "{{campaign_title}}" has reached its goal of {{goal_amount}}!',
 '["campaign_title", "goal_amount", "total_raised"]'::JSONB),
('digest_daily', 'Your daily campaign digest',
 '<h2>Daily Summary</h2>{{content}}',
 'Daily Summary: {{content}}',
 '["content", "date"]'::JSONB)
ON CONFLICT (name) DO NOTHING;