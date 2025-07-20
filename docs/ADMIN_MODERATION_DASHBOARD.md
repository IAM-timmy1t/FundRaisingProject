# Admin Moderation Dashboard Documentation

## Overview
The Admin Moderation Dashboard is a comprehensive interface for reviewing and moderating campaign submissions on the Blessed Horizon platform. It integrates with the AI-powered moderation system implemented in Task #22 to provide admins with all the tools needed to maintain quality and authenticity.

## Features

### 1. **Dashboard Overview**
- Real-time statistics showing pending reviews, today's approvals/rejections
- Average moderation scores and processing times
- Common issue tracking with top flags
- Quick access to moderation queue

### 2. **Review Queue**
- List of all campaigns pending review (status='under_review')
- Detailed moderation scores and AI-generated flags
- Quick approve/reject actions
- Bulk operations for efficiency
- Advanced filtering and sorting options

### 3. **Campaign Detail View**
- Full campaign information including story, budget, and media
- AI analysis with detailed insights
- Creator history and trust score
- Similar campaigns for comparison
- Manual review notes with mandatory rejection reasons

### 4. **Moderation History**
- Complete audit trail of all moderation decisions
- Searchable and filterable history
- Performance metrics for admin team
- Export capabilities for reporting

### 5. **Analytics Dashboard**
- Trend analysis of moderation patterns
- Admin performance metrics
- Approval rate tracking
- Processing time optimization insights

## Access Control

### Required Role
- User must have `role='admin'` in their user_profiles record
- Non-admin users are automatically redirected to the home page

### Permissions
- View all campaigns regardless of status
- Approve or reject campaigns
- Add manual review notes
- Access moderation history and analytics

## Workflow

### Standard Review Process
1. Admin accesses the moderation dashboard at `/admin/moderation`
2. Reviews campaigns in the queue sorted by priority
3. Clicks "Review Details" to open detailed view
4. Reviews AI analysis, flags, and recommendations
5. Adds review notes (mandatory for rejections)
6. Makes decision: Approve or Reject

### Bulk Operations
1. Select multiple campaigns using checkboxes
2. Use bulk approve/reject buttons
3. System processes all selected campaigns
4. Updates are reflected in real-time

## Integration Points

### Database Tables
- `campaigns` - Main campaign data
- `campaign_moderation` - AI moderation results and manual reviews
- `admin_actions` - Audit trail for all admin activities
- `user_profiles` - User information and trust scores

### Edge Functions
- `moderate-campaign` - AI moderation engine
- `create-campaign` - Integrated with auto-moderation

### Real-time Updates
- Supabase subscriptions for live queue updates
- Automatic refresh when new campaigns arrive
- Instant reflection of moderation decisions

## Best Practices

### Review Guidelines
1. **Check AI Flags First** - Review all AI-identified issues
2. **Verify Budget Breakdown** - Ensure realistic and transparent costs
3. **Assess Authenticity** - Look for genuine need indicators
4. **Consider Creator History** - Review past campaigns and trust score
5. **Document Decisions** - Always add notes, especially for rejections

### Common Red Flags
- Luxury items or vacation requests
- Vague or inconsistent stories
- Unrealistic budget expectations
- Missing documentation
- Suspicious patterns identified by AI

### Efficiency Tips
- Use keyboard shortcuts (coming soon)
- Filter by specific flags or score ranges
- Leverage bulk actions for clear-cut cases
- Set up browser notifications for new campaigns

## Technical Implementation

### Frontend Components
- `/src/pages/admin/AdminModerationPage.jsx` - Main page component
- `/src/components/admin/moderation/ModerationQueue.jsx` - Queue listing
- `/src/components/admin/moderation/CampaignDetail.jsx` - Detail modal
- `/src/components/admin/moderation/ModerationHistory.jsx` - History view

### API Endpoints
- Supabase RPC functions for statistics
- Direct table queries with RLS policies
- Real-time subscriptions for updates

### Performance Optimizations
- Pagination for large queues
- Lazy loading of campaign details
- Cached statistics with periodic refresh
- Optimized database indexes

## Monitoring and Maintenance

### Key Metrics to Track
- Average time to decision
- Approval/rejection rates
- AI accuracy (false positives/negatives)
- Admin workload distribution

### Regular Tasks
- Review flagging patterns for AI improvements
- Analyze rejection reasons for policy updates
- Monitor processing times for bottlenecks
- Audit admin actions for compliance

## Future Enhancements
- Advanced analytics with predictive insights
- Machine learning model updates based on decisions
- Automated escalation for complex cases
- Integration with external verification services
- Mobile app for on-the-go moderation

## Support
For technical issues or feature requests, contact the development team.
For policy questions or edge cases, escalate to the platform management team.
