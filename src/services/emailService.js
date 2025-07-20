import { supabase } from '../config/supabase';

class EmailService {
  constructor() {
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@blessed-horizon.com';
    this.fromName = import.meta.env.VITE_FROM_NAME || 'Blessed Horizon';
    this.appUrl = import.meta.env.VITE_PUBLIC_URL || 'https://blessed-horizon.com';
  }

  // Send donation received email to recipient
  async sendDonationEmail(recipientId, data) {
    const { data: recipient } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', recipientId)
      .single();

    if (!recipient?.email) return;

    const emailData = {
      to: recipient.email,
      subject: `New donation to ${data.campaign_title}`,
      template: 'donation',
      templateData: {
        donor_name: data.donor_name || 'Anonymous',
        amount: data.amount,
        currency: data.currency || 'USD',
        campaign_title: data.campaign_title,
        campaign_id: data.campaign_id,
        current_amount: data.current_amount,
        goal_amount: data.goal_amount,
        progress_percentage: Math.round((data.current_amount / data.goal_amount) * 100),
        days_remaining: data.days_remaining,
        donor_message: data.donor_message
      },
      categories: ['donation', 'transactional'],
      customArgs: {
        campaign_id: data.campaign_id,
        donation_id: data.donation_id
      }
    };

    return this.sendEmail(emailData);
  }

  // Send update notification to donors
  async sendUpdateEmail(donorEmails, data) {
    const emailPromises = donorEmails.map(email => {
      const emailData = {
        to: email,
        subject: `New update from ${data.campaign_title}`,
        template: 'update',
        templateData: {
          campaign_title: data.campaign_title,
          campaign_id: data.campaign_id,
          recipient_name: data.recipient_name,
          update_title: data.update_title,
          update_content: data.update_content,
          update_image: data.update_image,
          update_id: data.update_id,
          current_amount: data.current_amount,
          goal_amount: data.goal_amount,
          progress_percentage: Math.round((data.current_amount / data.goal_amount) * 100),
          currency: data.currency || 'USD',
          spend_amount: data.spend_amount,
          spend_category: data.spend_category
        },
        categories: ['update', 'campaign'],
        customArgs: {
          campaign_id: data.campaign_id,
          update_id: data.update_id
        }
      };

      return this.sendEmail(emailData);
    });

    return Promise.all(emailPromises);
  }

  // Send goal reached notification
  async sendGoalReachedEmail(userId, data) {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    // Check if user is donor or recipient
    const isDonor = data.user_role === 'donor';
    const isRecipient = data.user_role === 'recipient';

    const emailData = {
      to: user.email,
      subject: `🎉 ${data.campaign_title} reached its goal!`,
      template: 'goal-reached',
      templateData: {
        campaign_title: data.campaign_title,
        campaign_id: data.campaign_id,
        goal_amount: data.goal_amount,
        current_amount: data.current_amount,
        currency: data.currency || 'USD',
        donor_count: data.donor_count,
        average_donation: data.average_donation,
        days_to_goal: data.days_to_goal,
        is_donor: isDonor,
        is_recipient: isRecipient,
        user_donation_amount: data.user_donation_amount
      },
      categories: ['milestone', 'goal-reached'],
      customArgs: {
        campaign_id: data.campaign_id
      }
    };

    return this.sendEmail(emailData);
  }

  // Send campaign ending soon notification
  async sendCampaignEndingEmail(userId, data, timeLeft) {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    const isDonor = data.user_role === 'donor';
    const isGoalReached = data.current_amount >= data.goal_amount;
    const progressPercentage = Math.round((data.current_amount / data.goal_amount) * 100);
    const amountNeeded = data.goal_amount - data.current_amount;

    const emailData = {
      to: user.email,
      subject: `${data.campaign_title} is ending soon!`,
      template: 'campaign-ending',
      templateData: {
        campaign_title: data.campaign_title,
        campaign_id: data.campaign_id,
        time_left: timeLeft,
        current_amount: data.current_amount,
        goal_amount: data.goal_amount,
        amount_needed: amountNeeded,
        currency: data.currency || 'USD',
        progress_percentage: progressPercentage,
        is_donor: isDonor,
        is_goal_reached: isGoalReached,
        recent_update: data.recent_update,
        recent_update_date: data.recent_update_date,
        share_facebook_url: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.appUrl + '/campaigns/' + data.campaign_id)}`,
        share_twitter_url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.appUrl + '/campaigns/' + data.campaign_id)}&text=${encodeURIComponent('Help ' + data.campaign_title + ' reach its goal!')}`
      },
      categories: ['reminder', 'campaign-ending'],
      customArgs: {
        campaign_id: data.campaign_id
      }
    };

    return this.sendEmail(emailData);
  }

  // Send trust score change notification
  async sendTrustScoreChangeEmail(userId, data) {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    const scoreIncreased = data.new_score > data.old_score;
    const scoreChange = Math.abs(data.new_score - data.old_score);

    const emailData = {
      to: user.email,
      subject: 'Your Trust Score has changed',
      template: 'trust-score-change',
      templateData: {
        user_name: user.full_name || 'there',
        old_score: data.old_score,
        new_score: data.new_score,
        score_change: scoreChange,
        score_increased: scoreIncreased,
        metrics: {
          update_timeliness: data.metrics.update_timeliness,
          update_timeliness_percentage: (data.metrics.update_timeliness / 40) * 100,
          spend_accuracy: data.metrics.spend_accuracy,
          spend_accuracy_percentage: (data.metrics.spend_accuracy / 30) * 100,
          donor_sentiment: data.metrics.donor_sentiment,
          donor_sentiment_percentage: (data.metrics.donor_sentiment / 15) * 100,
          identity_verification: data.metrics.identity_verification,
          identity_verification_percentage: (data.metrics.identity_verification / 10) * 100
        },
        reasons: data.reasons || []
      },
      categories: ['trust-score', 'account'],
      customArgs: {
        user_id: userId
      }
    };

    return this.sendEmail(emailData);
  }

  // Send daily digest email
  async sendDailyDigest(userId, notifications) {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    // Group notifications by type
    const grouped = this.groupNotificationsByType(notifications);
    
    // Get active campaigns for user
    const { data: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id, title, current_amount, goal_amount, deadline')
      .eq('user_id', userId)
      .eq('status', 'active');

    const emailData = {
      to: user.email,
      subject: 'Your Daily Blessed Horizon Digest',
      template: 'daily-digest',
      templateData: {
        user_name: user.full_name || 'there',
        donations: grouped.donations || [],
        updates: grouped.updates || [],
        milestones: grouped.milestones || [],
        total_donations_amount: this.calculateTotalAmount(grouped.donations),
        currency: 'USD',
        active_campaigns: this.formatActiveCampaigns(activeCampaigns)
      },
      categories: ['digest', 'daily'],
      customArgs: {
        user_id: userId,
        digest_type: 'daily'
      }
    };

    return this.sendEmail(emailData);
  }

  // Send weekly digest email
  async sendWeeklyDigest(userId, notifications, weekData) {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    const emailData = {
      to: user.email,
      subject: 'Your Weekly Blessed Horizon Report',
      template: 'weekly-digest',
      templateData: {
        user_name: user.full_name || 'there',
        week_start: weekData.start_date,
        week_end: weekData.end_date,
        total_donations: weekData.total_donations,
        total_amount: weekData.total_amount,
        total_updates: weekData.total_updates,
        currency: 'USD',
        top_campaigns: weekData.top_campaigns,
        donor_stories: weekData.donor_stories,
        upcoming_endings: weekData.upcoming_endings,
        platform_stats: weekData.platform_stats
      },
      categories: ['digest', 'weekly'],
      customArgs: {
        user_id: userId,
        digest_type: 'weekly'
      }
    };

    return this.sendEmail(emailData);
  }

  // Core email sending method
  async sendEmail(emailData) {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          template: emailData.template,
          templateData: emailData.templateData,
          html: emailData.html,
          text: emailData.text,
          attachments: emailData.attachments,
          categories: emailData.categories,
          customArgs: emailData.customArgs
        }
      });

      if (error) {
        console.error('Failed to send email:', error);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  // Helper methods
  groupNotificationsByType(notifications) {
    return notifications.reduce((acc, notif) => {
      if (!acc[notif.type]) acc[notif.type] = [];
      acc[notif.type].push(notif);
      return acc;
    }, {});
  }

  calculateTotalAmount(donations) {
    if (!donations || !donations.length) return 0;
    return donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  }

  formatActiveCampaigns(campaigns) {
    if (!campaigns) return [];
    
    return campaigns.map(c => {
      const progressPercentage = Math.round((c.current_amount / c.goal_amount) * 100);
      const daysRemaining = Math.ceil((new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        campaign_id: c.id,
        title: c.title,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        ending_soon: daysRemaining <= 7
      };
    });
  }

  // Test email sending
  async sendTestEmail(to, templateName) {
    const testData = this.getTestDataForTemplate(templateName);
    
    return this.sendEmail({
      to,
      template: templateName,
      templateData: testData,
      categories: ['test', templateName],
      customArgs: {
        test: true,
        template: templateName
      }
    });
  }

  // Get test data for templates
  getTestDataForTemplate(templateName) {
    const testData = {
      donation: {
        donor_name: 'John Doe',
        amount: 100,
        currency: 'USD',
        campaign_title: 'Help Build a School in Kenya',
        campaign_id: 'test-campaign-1',
        current_amount: 5500,
        goal_amount: 10000,
        progress_percentage: 55,
        days_remaining: 15,
        donor_message: 'Happy to support this wonderful cause!'
      },
      update: {
        campaign_title: 'Help Build a School in Kenya',
        campaign_id: 'test-campaign-1',
        recipient_name: 'Sarah Johnson',
        update_title: 'Construction Progress Update',
        update_content: '<p>Great news! The foundation has been laid and walls are going up. Thank you for your continued support!</p>',
        update_image: 'https://example.com/update-image.jpg',
        update_id: 'update-123',
        current_amount: 5500,
        goal_amount: 10000,
        progress_percentage: 55,
        currency: 'USD',
        spend_amount: 2000,
        spend_category: 'Construction Materials'
      },
      'goal-reached': {
        campaign_title: 'Help Build a School in Kenya',
        campaign_id: 'test-campaign-1',
        goal_amount: 10000,
        current_amount: 10500,
        currency: 'USD',
        donor_count: 45,
        average_donation: 233,
        days_to_goal: 22,
        is_donor: true,
        is_recipient: false,
        user_donation_amount: 250
      },
      'campaign-ending': {
        campaign_title: 'Help Build a School in Kenya',
        campaign_id: 'test-campaign-1',
        time_left: '48 hours',
        current_amount: 8500,
        goal_amount: 10000,
        amount_needed: 1500,
        currency: 'USD',
        progress_percentage: 85,
        is_donor: false,
        is_goal_reached: false,
        recent_update: 'Construction is progressing well!',
        recent_update_date: '2 days ago'
      },
      'trust-score-change': {
        user_name: 'John Doe',
        old_score: 75,
        new_score: 82,
        score_change: 7,
        score_increased: true,
        metrics: {
          update_timeliness: 35,
          update_timeliness_percentage: 87.5,
          spend_accuracy: 26,
          spend_accuracy_percentage: 86.7,
          donor_sentiment: 12,
          donor_sentiment_percentage: 80,
          identity_verification: 9,
          identity_verification_percentage: 90
        },
        reasons: [
          'Posted regular campaign updates',
          'Uploaded receipts for all expenses',
          'Positive donor feedback received'
        ]
      }
    };

    return testData[templateName] || {};
  }
}

// Export singleton instance
export const emailService = new EmailService();