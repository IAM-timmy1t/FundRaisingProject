# Analytics Dashboard Documentation

## Overview
The analytics dashboard provides comprehensive insights for campaign creators to track performance, understand donor behavior, and optimize their fundraising efforts.

## Features

### 1. Campaign Overview
- **Total Raised**: Real-time tracking of funds raised
- **Goal Progress**: Visual percentage of goal achieved
- **Donor Count**: Unique donors who contributed
- **Average Donation**: Mean donation amount
- **Donation Trend**: Time-series chart of daily donations
- **Donor Geography**: Geographic distribution of donors

### 2. Traffic Analytics
- **Page Views**: Total campaign page visits
- **Unique Visitors**: Individual visitors tracked
- **Conversion Rate**: Percentage of visitors who donate
- **Traffic Sources**: Referral sources (Google, Facebook, Direct, etc.)
- **Device Breakdown**: Desktop vs Mobile vs Tablet usage
- **Browser Stats**: Chrome, Safari, Firefox distribution

### 3. Engagement Metrics
- **Follower Count**: Campaign followers over time
- **Update Performance**: Views, likes, comments per update
- **Engagement Rate**: Average interactions per update
- **Share Statistics**: Social media shares tracked
- **Comment Analytics**: User feedback and sentiment

### 4. Financial Reporting
- **Revenue Breakdown**: Gross, fees, and net amounts
- **Monthly Trends**: Revenue visualization by month
- **Fee Analysis**: Platform and processing fee breakdown
- **Payout History**: Withdrawal tracking
- **Pending Payouts**: Funds awaiting withdrawal

## Technical Implementation

### Database Schema
```sql
-- Analytics Events Table
campaign_analytics_events
├── id (UUID)
├── campaign_id (UUID)
├── session_id (VARCHAR)
├── event_type (VARCHAR)
├── event_data (JSONB)
├── user_id (UUID)
├── device_type (VARCHAR)
├── browser (VARCHAR)
├── referrer_source (VARCHAR)
└── timestamp (TIMESTAMP)

-- Update Engagements Table
update_engagements
├── id (UUID)
├── update_id (UUID)
├── user_id (UUID)
├── action (VARCHAR)
└── created_at (TIMESTAMP)

-- Campaign Followers Table
campaign_followers
├── id (UUID)
├── campaign_id (UUID)
├── user_id (UUID)
├── followed_at (TIMESTAMP)
└── notification_enabled (BOOLEAN)
```

### Analytics Functions
1. `get_campaign_analytics()` - Core metrics and donation data
2. `get_campaign_traffic_analytics()` - Traffic and conversion data
3. `get_campaign_engagement_metrics()` - Social engagement stats
4. `get_campaign_financial_analytics()` - Revenue and fee analysis

### Event Tracking
```javascript
// Track page view
analyticsService.trackCampaignView(campaignId);

// Track donation events
analyticsService.trackDonationEvent(campaignId, 'donation_started');
analyticsService.trackDonationEvent(campaignId, 'donation_completed', { amount });
```

## Usage

### Accessing Analytics
1. Navigate to "My Campaigns" from the user menu
2. Click the "Analytics" button on any active campaign
3. Use date range selector to filter data
4. Switch between tabs for different metrics

### Exporting Data
- Click "Export" button on any chart
- Downloads CSV file with raw data
- Includes timestamps and all metrics

### Real-time Updates
- Data refreshes automatically every 5 minutes
- Manual refresh available via refresh button
- Live donation notifications appear instantly

## Performance Optimization
- Indexed database queries for fast loading
- Client-side data caching
- Lazy loading of chart components
- Aggregated data for large datasets

## Privacy & Security
- Analytics respect user privacy
- No personally identifiable information in events
- IP addresses are anonymized
- GDPR compliant data collection
- Users can opt-out of tracking

## Best Practices

### For Campaign Creators
1. Check analytics daily during active campaigns
2. Use traffic source data to optimize marketing
3. Post updates when engagement drops
4. Monitor conversion rates for optimization
5. Export data for detailed analysis

### For Developers
1. Always use the analytics service for tracking
2. Batch event submissions when possible
3. Include relevant context in event data
4. Test analytics in development environment
5. Monitor query performance

## Troubleshooting

### Common Issues
1. **No data showing**: Check if campaign has any activity
2. **Slow loading**: Clear browser cache, check connection
3. **Export failing**: Ensure pop-ups are allowed
4. **Missing metrics**: Verify user permissions

### Error Codes
- `ANALYTICS_001`: Insufficient permissions
- `ANALYTICS_002`: Invalid date range
- `ANALYTICS_003`: Campaign not found
- `ANALYTICS_004`: Export failed

## Future Enhancements
- A/B testing for campaign content
- Predictive analytics for success
- Competitor benchmarking
- Advanced segmentation
- Email reports automation
- Mobile app analytics
