import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Handlebars } from 'https://deno.land/x/handlebars@v0.9.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Handlebars
const handlebars = new Handlebars();

// Helper functions for Handlebars
handlebars.registerHelper('if', function(conditional: any, options: any) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

handlebars.registerHelper('each', function(context: any, options: any) {
  let ret = "";
  for(let i = 0, j = context.length; i < j; i++) {
    ret = ret + options.fn(context[i]);
  }
  return ret;
});

handlebars.registerHelper('formatCurrency', function(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
});

handlebars.registerHelper('formatDate', function(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Load email templates
const templateCache = new Map<string, any>();

// Email templates for Edge Function
const emailTemplates = {
  base: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        @media screen and (max-width: 600px) {
            h1 { font-size: 24px !important; line-height: 32px !important; }
            h2 { font-size: 20px !important; line-height: 28px !important; }
            .container { width: 100% !important; max-width: 100% !important; }
            .content { padding: 20px !important; }
            .button { width: 100% !important; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; color: #2d3748; }
        .preheader { display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
        .header { background-color: #3b82f6; padding: 30px; text-align: center; }
        .header img { max-width: 150px; height: auto; }
        .content { padding: 40px 30px; }
        .footer { background-color: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
        .button { display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background-color: #2563eb; }
        .social-links { margin: 20px 0; }
        .social-links a { display: inline-block; margin: 0 10px; }
        .social-links img { width: 24px; height: 24px; }
    </style>
</head>
<body>
    <div class="preheader">{{preheader}}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <div class="container">
                    <div class="header">
                        <img src="{{logo_url}}" alt="Blessed Horizon" style="display: block; margin: 0 auto;">
                    </div>
                    <div class="content">
                        {{{content}}}
                    </div>
                    <div class="footer">
                        <div class="social-links">
                            <a href="https://facebook.com/blessedhorizon"><img src="{{facebook_icon}}" alt="Facebook"></a>
                            <a href="https://twitter.com/blessedhorizon"><img src="{{twitter_icon}}" alt="Twitter"></a>
                            <a href="https://instagram.com/blessedhorizon"><img src="{{instagram_icon}}" alt="Instagram"></a>
                        </div>
                        <p style="margin: 20px 0 10px;">
                            Blessed Horizon - Transparent Faith-Based Crowdfunding<br>
                            © {{current_year}} All rights reserved.
                        </p>
                        <p style="margin: 10px 0;">
                            <a href="{{unsubscribe_url}}" style="color: #718096; text-decoration: underline;">Unsubscribe</a> | 
                            <a href="{{preferences_url}}" style="color: #718096; text-decoration: underline;">Update Preferences</a>
                        </p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`,
  
  donation: `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">You received a donation! 🎉</h1>

<div style="background-color: #e6fffa; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
  <h2 style="color: #065f46; margin: 0 0 10px;">{{formatCurrency amount currency}}</h2>
  <p style="color: #047857; margin: 0;">from <strong>{{donor_name}}</strong></p>
</div>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Great news! Your campaign "<strong>{{campaign_title}}</strong>" just received a generous donation.
</p>

{{#if donor_message}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Message from {{donor_name}}:</h3>
  <p style="font-style: italic; color: #4a5568;">"{{donor_message}}"</p>
</div>
{{/if}}

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Campaign Progress</h3>
  <div style="background-color: #e2e8f0; border-radius: 4px; height: 20px; margin: 10px 0; overflow: hidden;">
    <div style="background-color: #3b82f6; height: 100%; width: {{progress_percentage}}%;"></div>
  </div>
  <p style="color: #4a5568; margin: 10px 0 0;">
    <strong>{{formatCurrency current_amount currency}}</strong> raised of <strong>{{formatCurrency goal_amount currency}}</strong> goal ({{progress_percentage}}%)
  </p>
  {{#if days_remaining}}
  <p style="color: #718096; font-size: 14px;">{{days_remaining}} days remaining</p>
  {{/if}}
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/campaigns/{{campaign_id}}" class="button">View Campaign</a>
</div>

<p style="color: #718096; font-size: 14px;">
  Remember to thank your donor and keep them updated on your campaign's progress!
</p>`,

  update: `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">Campaign Update 📢</h1>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  <strong>{{recipient_name}}</strong> posted a new update for "<strong>{{campaign_title}}</strong>"
</p>

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h2 style="color: #2d3748; margin-top: 0;">{{update_title}}</h2>
  {{#if update_image}}
  <img src="{{update_image}}" alt="Update image" style="width: 100%; max-width: 500px; height: auto; border-radius: 6px; margin: 15px 0;">
  {{/if}}
  <div style="color: #4a5568; line-height: 1.6;">
    {{{update_content}}}
  </div>
</div>

{{#if spend_amount}}
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
  <h3 style="color: #92400e; margin: 0 0 10px;">Fund Usage</h3>
  <p style="color: #78350f; margin: 0;">
    <strong>{{formatCurrency spend_amount currency}}</strong> spent on <strong>{{spend_category}}</strong>
  </p>
</div>
{{/if}}

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Campaign Progress</h3>
  <div style="background-color: #e2e8f0; border-radius: 4px; height: 20px; margin: 10px 0; overflow: hidden;">
    <div style="background-color: #3b82f6; height: 100%; width: {{progress_percentage}}%;"></div>
  </div>
  <p style="color: #4a5568; margin: 10px 0 0;">
    <strong>{{formatCurrency current_amount currency}}</strong> raised of <strong>{{formatCurrency goal_amount currency}}</strong> goal
  </p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/campaigns/{{campaign_id}}/updates/{{update_id}}" class="button">View Full Update</a>
</div>`,

  'goal-reached': `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">🎉 Goal Reached! 🎉</h1>

<div style="text-align: center; margin: 30px 0;">
  <div style="display: inline-block; background-color: #10b981; color: white; padding: 20px 40px; border-radius: 8px;">
    <h2 style="margin: 0; font-size: 36px;">{{formatCurrency goal_amount currency}}</h2>
    <p style="margin: 10px 0 0; font-size: 18px;">FULLY FUNDED!</p>
  </div>
</div>

<p style="font-size: 18px; line-height: 1.6; color: #4a5568; text-align: center;">
  <strong>{{campaign_title}}</strong> has reached its funding goal!
</p>

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Campaign Stats</h3>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      <strong>Total Raised:</strong> {{formatCurrency current_amount currency}}
    </li>
    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      <strong>Number of Donors:</strong> {{donor_count}}
    </li>
    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      <strong>Average Donation:</strong> {{formatCurrency average_donation currency}}
    </li>
    <li style="padding: 8px 0;">
      <strong>Days to Goal:</strong> {{days_to_goal}} days
    </li>
  </ul>
</div>

{{#if is_donor}}
<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Thank you for being part of this success! Your donation of <strong>{{formatCurrency user_donation_amount currency}}</strong> helped make this possible.
</p>
{{/if}}

{{#if is_recipient}}
<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Congratulations on reaching your goal! Your donors are counting on you to use these funds wisely and keep them updated on your progress.
</p>
{{/if}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/campaigns/{{campaign_id}}" class="button">View Campaign</a>
</div>`,

  'campaign-ending': `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">⏰ Campaign Ending Soon!</h1>

<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
  <h2 style="color: #92400e; margin: 0;">Only {{time_left}} remaining!</h2>
</div>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  "<strong>{{campaign_title}}</strong>" is about to end. {{#unless is_goal_reached}}This is your last chance to help them reach their goal!{{/unless}}
</p>

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Campaign Progress</h3>
  <div style="background-color: #e2e8f0; border-radius: 4px; height: 20px; margin: 10px 0; overflow: hidden;">
    <div style="background-color: {{#if is_goal_reached}}#10b981{{else}}#f59e0b{{/if}}; height: 100%; width: {{progress_percentage}}%;"></div>
  </div>
  <p style="color: #4a5568; margin: 10px 0 0;">
    <strong>{{formatCurrency current_amount currency}}</strong> raised of <strong>{{formatCurrency goal_amount currency}}</strong> goal
  </p>
  {{#unless is_goal_reached}}
  <p style="color: #dc2626; font-weight: 600; margin: 10px 0 0;">
    Still needs {{formatCurrency amount_needed currency}} to reach the goal!
  </p>
  {{/unless}}
</div>

{{#if recent_update}}
<div style="background-color: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
  <h4 style="color: #4338ca; margin: 0 0 5px;">Latest Update ({{recent_update_date}})</h4>
  <p style="color: #4c1d95; margin: 0;">{{recent_update}}</p>
</div>
{{/if}}

{{#unless is_donor}}
<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/campaigns/{{campaign_id}}" class="button">Donate Now</a>
</div>
{{else}}
<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/campaigns/{{campaign_id}}" class="button">View Campaign</a>
</div>
{{/unless}}

<div style="text-align: center; margin: 20px 0;">
  <p style="color: #718096; font-size: 14px; margin-bottom: 10px;">Share this campaign:</p>
  <a href="{{share_facebook_url}}" style="display: inline-block; margin: 0 10px;">Share on Facebook</a>
  <a href="{{share_twitter_url}}" style="display: inline-block; margin: 0 10px;">Share on Twitter</a>
</div>`,

  'trust-score-change': `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">Trust Score Update 📊</h1>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Hello {{user_name}},
</p>

<div style="text-align: center; margin: 30px 0;">
  <div style="display: inline-block; padding: 20px;">
    <div style="display: flex; align-items: center; justify-content: center; gap: 30px;">
      <div style="text-align: center;">
        <p style="margin: 0; color: #718096; font-size: 14px;">Previous Score</p>
        <p style="margin: 5px 0 0; font-size: 36px; font-weight: bold; color: #718096;">{{old_score}}</p>
      </div>
      <div style="font-size: 24px; color: {{#if score_increased}}#10b981{{else}}#ef4444{{/if}};">→</div>
      <div style="text-align: center;">
        <p style="margin: 0; color: {{#if score_increased}}#065f46{{else}}#991b1b{{/if}}; font-size: 14px;">New Score</p>
        <p style="margin: 5px 0 0; font-size: 36px; font-weight: bold; color: {{#if score_increased}}#10b981{{else}}#ef4444{{/if}};">{{new_score}}</p>
      </div>
    </div>
  </div>
</div>

<div style="background-color: {{#if score_increased}}#d1fae5{{else}}#fee2e2{{/if}}; border-left: 4px solid {{#if score_increased}}#10b981{{else}}#ef4444{{/if}}; padding: 15px; margin: 20px 0;">
  <p style="color: {{#if score_increased}}#065f46{{else}}#991b1b{{/if}}; margin: 0; font-weight: 600;">
    Your trust score {{#if score_increased}}increased{{else}}decreased{{/if}} by {{score_change}} points
  </p>
</div>

<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Score Breakdown</h3>
  
  <div style="margin: 15px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Update Timeliness</span>
      <span><strong>{{metrics.update_timeliness}}/40</strong> ({{metrics.update_timeliness_percentage}}%)</span>
    </div>
    <div style="background-color: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; height: 100%; width: {{metrics.update_timeliness_percentage}}%;"></div>
    </div>
  </div>
  
  <div style="margin: 15px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Spend Accuracy</span>
      <span><strong>{{metrics.spend_accuracy}}/30</strong> ({{metrics.spend_accuracy_percentage}}%)</span>
    </div>
    <div style="background-color: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; height: 100%; width: {{metrics.spend_accuracy_percentage}}%;"></div>
    </div>
  </div>
  
  <div style="margin: 15px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Donor Sentiment</span>
      <span><strong>{{metrics.donor_sentiment}}/15</strong> ({{metrics.donor_sentiment_percentage}}%)</span>
    </div>
    <div style="background-color: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; height: 100%; width: {{metrics.donor_sentiment_percentage}}%;"></div>
    </div>
  </div>
  
  <div style="margin: 15px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span>Identity Verification</span>
      <span><strong>{{metrics.identity_verification}}/10</strong> ({{metrics.identity_verification_percentage}}%)</span>
    </div>
    <div style="background-color: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; height: 100%; width: {{metrics.identity_verification_percentage}}%;"></div>
    </div>
  </div>
</div>

{{#if reasons}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">What Influenced Your Score</h3>
  <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
    {{#each reasons}}
    <li style="margin: 5px 0;">{{this}}</li>
    {{/each}}
  </ul>
</div>
{{/if}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/dashboard" class="button">View Dashboard</a>
</div>

<p style="color: #718096; font-size: 14px;">
  Your trust score is calculated based on your campaign management behavior and helps donors feel confident in supporting your cause.
</p>`,

  'daily-digest': `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">Your Daily Digest 📰</h1>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Good morning {{user_name}}! Here's what happened in the last 24 hours:
</p>

{{#if donations}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">💰 New Donations ({{donations.length}})</h3>
  <p style="font-size: 24px; color: #10b981; font-weight: bold; margin: 10px 0;">
    {{formatCurrency total_donations_amount currency}} received
  </p>
  {{#each donations}}
  <div style="border-top: 1px solid #e2e8f0; padding: 10px 0;">
    <p style="margin: 0;"><strong>{{this.donor_name}}</strong> donated <strong>{{formatCurrency this.amount this.currency}}</strong></p>
    <p style="margin: 5px 0 0; color: #718096; font-size: 14px;">to {{this.campaign_title}}</p>
  </div>
  {{/each}}
</div>
{{/if}}

{{#if updates}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">📢 Campaign Updates ({{updates.length}})</h3>
  {{#each updates}}
  <div style="border-top: 1px solid #e2e8f0; padding: 10px 0;">
    <p style="margin: 0;"><strong>{{this.campaign_title}}</strong></p>
    <p style="margin: 5px 0 0; color: #718096;">{{this.update_title}}</p>
  </div>
  {{/each}}
</div>
{{/if}}

{{#if milestones}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">🎉 Milestones Reached ({{milestones.length}})</h3>
  {{#each milestones}}
  <div style="border-top: 1px solid #e2e8f0; padding: 10px 0;">
    <p style="margin: 0;"><strong>{{this.campaign_title}}</strong> {{this.milestone_text}}</p>
  </div>
  {{/each}}
</div>
{{/if}}

{{#if active_campaigns}}
<div style="background-color: #e0e7ff; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #4338ca; margin-top: 0;">Your Active Campaigns</h3>
  {{#each active_campaigns}}
  <div style="border-top: 1px solid #c7d2fe; padding: 10px 0;">
    <p style="margin: 0;"><strong>{{this.title}}</strong></p>
    <div style="background-color: #e2e8f0; border-radius: 4px; height: 8px; margin: 8px 0; overflow: hidden;">
      <div style="background-color: #6366f1; height: 100%; width: {{this.progress_percentage}}%;"></div>
    </div>
    <p style="margin: 0; color: #6366f1; font-size: 14px;">
      {{this.progress_percentage}}% funded{{#if this.ending_soon}} • <span style="color: #dc2626;">Ending in {{this.days_remaining}} days!</span>{{/if}}
    </p>
  </div>
  {{/each}}
</div>
{{/if}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/dashboard" class="button">View Dashboard</a>
</div>`,

  'weekly-digest': `
<h1 style="color: #1a202c; font-size: 28px; margin-bottom: 20px;">Your Weekly Report 📊</h1>

<p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
  Hello {{user_name}}! Here's your weekly summary for {{formatDate week_start}} - {{formatDate week_end}}:
</p>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
  <div style="background-color: #d1fae5; border-radius: 6px; padding: 20px; text-align: center;">
    <h3 style="color: #065f46; margin: 0;">Total Donations</h3>
    <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 10px 0;">{{total_donations}}</p>
  </div>
  <div style="background-color: #dbeafe; border-radius: 6px; padding: 20px; text-align: center;">
    <h3 style="color: #1e3a8a; margin: 0;">Total Raised</h3>
    <p style="font-size: 32px; font-weight: bold; color: #3b82f6; margin: 10px 0;">{{formatCurrency total_amount currency}}</p>
  </div>
</div>

{{#if top_campaigns}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">🏆 Top Performing Campaigns</h3>
  {{#each top_campaigns}}
  <div style="border-top: 1px solid #e2e8f0; padding: 15px 0;">
    <h4 style="margin: 0;">{{this.title}}</h4>
    <p style="margin: 5px 0; color: #4a5568;">{{formatCurrency this.amount_raised this.currency}} raised ({{this.progress_percentage}}% of goal)</p>
    <p style="margin: 5px 0 0; color: #718096; font-size: 14px;">{{this.donor_count}} donors • {{this.update_count}} updates</p>
  </div>
  {{/each}}
</div>
{{/if}}

{{#if upcoming_endings}}
<div style="background-color: #fef3c7; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #92400e; margin-top: 0;">⏰ Campaigns Ending Soon</h3>
  {{#each upcoming_endings}}
  <div style="border-top: 1px solid #fcd34d; padding: 10px 0;">
    <p style="margin: 0;"><strong>{{this.title}}</strong></p>
    <p style="margin: 5px 0 0; color: #78350f;">Ends in {{this.days_left}} days • {{this.percentage_to_goal}}% of goal</p>
  </div>
  {{/each}}
</div>
{{/if}}

{{#if platform_stats}}
<div style="background-color: #f7fafc; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #2d3748; margin-top: 0;">Platform Impact</h3>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      Total campaigns funded: <strong>{{platform_stats.campaigns_funded}}</strong>
    </li>
    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      Total raised this week: <strong>{{formatCurrency platform_stats.total_raised_week currency}}</strong>
    </li>
    <li style="padding: 8px 0;">
      Lives impacted: <strong>{{platform_stats.lives_impacted}}+</strong>
    </li>
  </ul>
</div>
{{/if}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{app_url}}/dashboard" class="button">View Full Dashboard</a>
</div>`
};

async function loadTemplate(templateName: string): Promise<any> {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  try {
    // Get template from emailTemplates object
    const templateContent = emailTemplates[templateName];
    if (!templateContent) {
      console.error(`Template ${templateName} not found`);
      return null;
    }
    
    const compiledTemplate = handlebars.compile(templateContent);
    templateCache.set(templateName, compiledTemplate);
    return compiledTemplate;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      subject, 
      html, 
      text, 
      template, 
      templateData,
      attachments,
      categories,
      customArgs 
    } = await req.json();

    // Validate input
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and subject' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get SendGrid configuration
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@blessed-horizon.com';
    const FROM_NAME = Deno.env.get('FROM_NAME') || 'Blessed Horizon';
    const APP_URL = Deno.env.get('PUBLIC_URL') || 'https://blessed-horizon.com';

    if (!SENDGRID_API_KEY) {
      // Fallback to SMTP if SendGrid not configured
      console.warn('SendGrid not configured, falling back to SMTP');
      
      const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts');
      const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
      const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
      const SMTP_USER = Deno.env.get('SMTP_USER');
      const SMTP_PASS = Deno.env.get('SMTP_PASS');

      if (!SMTP_USER || !SMTP_PASS) {
        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const client = new SmtpClient();
      await client.connectTLS({
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASS,
      });

      await client.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: to,
        subject: subject,
        content: html || text,
        headers: {
          'Content-Type': html ? 'text/html' : 'text/plain',
        },
      });

      await client.close();
    } else {
      // Use SendGrid API
      let emailHtml = html;
      let emailText = text;

      // Process template if provided
      if (template && templateData) {
        const baseTemplate = await loadTemplate('base');
        const contentTemplate = await loadTemplate(template);

        if (baseTemplate && contentTemplate) {
          // Generate subject if not provided
          if (!subject) {
            subject = generateSubjectForTemplate(template, templateData);
          }

          // Render content template
          const contentHtml = contentTemplate({
            ...templateData,
            app_url: APP_URL,
            current_year: new Date().getFullYear()
          });

          // Common template data
          const baseData = {
            subject,
            content: contentHtml,
            logo_url: `${APP_URL}/logo.png`,
            app_url: APP_URL,
            unsubscribe_url: `${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}`,
            preferences_url: `${APP_URL}/settings/notifications`,
            current_year: new Date().getFullYear(),
            facebook_icon: `${APP_URL}/icons/facebook.png`,
            twitter_icon: `${APP_URL}/icons/twitter.png`,
            instagram_icon: `${APP_URL}/icons/instagram.png`,
            preheader: generatePreheaderForTemplate(template, templateData)
          };

          // Render base template with content
          emailHtml = baseTemplate(baseData);
          
          // Generate text version if not provided
          if (!emailText) {
            emailText = generateTextFromHtml(contentHtml);
          }
        }
      }

      // Ensure we have content to send
      if (!emailHtml && !emailText) {
        return new Response(
          JSON.stringify({ error: 'No email content provided' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Prepare SendGrid request
      const sendGridData = {
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
          custom_args: customArgs || {}
        }],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        content: [],
        categories: categories || ['transactional'],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        }
      };

      // Add content
      if (emailText) {
        sendGridData.content.push({
          type: 'text/plain',
          value: emailText
        });
      }
      if (emailHtml) {
        sendGridData.content.push({
          type: 'text/html',
          value: emailHtml
        });
      }

      // Add attachments if provided
      if (attachments && Array.isArray(attachments)) {
        sendGridData.attachments = attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: att.disposition || 'attachment'
        }));
      }

      // Send via SendGrid API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendGridData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('SendGrid error:', errorData);
        throw new Error(`SendGrid API error: ${response.status}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        provider: SENDGRID_API_KEY ? 'sendgrid' : 'smtp'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to generate text from HTML
function generateTextFromHtml(html: string): string {
  // Basic HTML to text conversion
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Helper function to generate subject lines based on template
function generateSubjectForTemplate(template: string, data: any): string {
  const subjects = {
    donation: `New donation to ${data.campaign_title}`,
    update: `New update from ${data.campaign_title}`,
    'goal-reached': `🎉 ${data.campaign_title} reached its goal!`,
    'campaign-ending': `${data.campaign_title} is ending soon!`,
    'trust-score-change': 'Your Trust Score has changed',
    'daily-digest': 'Your Daily Blessed Horizon Digest',
    'weekly-digest': 'Your Weekly Blessed Horizon Report'
  };

  return subjects[template] || 'Update from Blessed Horizon';
}

// Helper function to generate preheader text
function generatePreheaderForTemplate(template: string, data: any): string {
  const preheaders = {
    donation: `${data.donor_name} donated ${data.currency || 'USD'} ${data.amount} to your campaign`,
    update: `${data.recipient_name} posted: ${data.update_title}`,
    'goal-reached': `Congratulations! ${data.campaign_title} is fully funded!`,
    'campaign-ending': `Only ${data.time_left} remaining for ${data.campaign_title}`,
    'trust-score-change': `Your trust score ${data.new_score > data.old_score ? 'increased' : 'decreased'} to ${data.new_score}`,
    'daily-digest': 'Your daily summary of campaign activity',
    'weekly-digest': 'Your weekly campaign performance report'
  };

  return preheaders[template] || 'Important update from Blessed Horizon';
}
