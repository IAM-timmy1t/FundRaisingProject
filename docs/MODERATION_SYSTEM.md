# Campaign Moderation System Documentation

## Overview
The Campaign Moderation System is an AI-powered content analysis tool that automatically screens fundraising campaigns for inappropriate content, luxury items, fraud patterns, and trust indicators.

## Features

### 1. Automated Content Analysis
- **Luxury Detection**: Identifies expensive or unnecessary items
- **Inappropriate Content**: Flags prohibited content like drugs, weapons, hate speech
- **Fraud Pattern Recognition**: Detects scam indicators and suspicious requests
- **Trust Score Calculation**: Rewards transparency and faith-based content
- **Need Type Validation**: Ensures campaigns match their stated category

### 2. Scoring System
Each campaign receives scores in 5 categories:
- **Luxury Score** (0-100): Higher = more luxury items detected
- **Inappropriate Score** (0-100): Higher = more prohibited content
- **Fraud Score** (0-100): Higher = more suspicious patterns
- **Need Validation** (0-100): Higher = better category match
- **Trust Score** (0-100): Higher = more transparency indicators

**Overall Score** is calculated using weighted averages, with penalties for negative indicators.

### 3. Decision Making
Based on the overall score:
- **70-100**: Automatically approved ✅
- **40-69**: Requires manual review ⚠️
- **0-39**: Automatically rejected ❌

## Implementation

### Database Schema
```sql
-- campaign_moderation table stores all moderation results
-- moderation_rules table contains configurable detection patterns
-- Campaigns table enhanced with moderation_status field
```

### Service Methods
```javascript
// Main analysis method
moderationService.analyzeCampaign(campaign)

// Update campaign status
moderationService.updateCampaignStatus(campaignId, result)

// Get moderation history
moderationService.getModerationHistory(campaignId)

// Batch moderation
moderationService.batchModerate(campaigns)
```

### React Hook
```javascript
const {
  moderating,
  moderationResult,
  moderateCampaign,
  approveCampaign,
  rejectCampaign,
  requestChanges
} = useModeration();
```

## Moderation Rules

### Luxury Patterns
- Brand names: Mercedes, BMW, Rolex, Gucci, etc.
- Luxury items: mansion, yacht, private jet
- Keywords: luxury, premium, high-end, deluxe

### Fraud Indicators
- Get-rich-quick: "guaranteed returns", "double your money"
- Urgency: Multiple uses of "urgent", "ASAP", "immediately"
- Payment methods: Wire transfer, Western Union
- Vague descriptions or missing budget breakdowns

### Trust Indicators
- Transparency: receipts, documentation, itemized budgets
- Faith references: God, prayer, scripture quotes
- Community focus: local, family, community support

## Integration Guide

### 1. Campaign Creation Flow
```javascript
// In CreateCampaign component
const { moderateCampaign } = useModeration();

const handleSubmit = async (campaignData) => {
  // Create campaign
  const campaign = await createCampaign(campaignData);
  
  // Run moderation
  const moderationResult = await moderateCampaign(campaign);
  
  // Handle result
  if (moderationResult.decision === 'approved') {
    // Publish campaign
  } else if (moderationResult.decision === 'review') {
    // Send to manual review
  } else {
    // Show rejection message
  }
};
```

### 2. Admin Review Dashboard
```javascript
// Use ModerationReview component
<ModerationReview
  campaign={campaign}
  onApprove={handleApprove}
  onReject={handleReject}
  onRequestChanges={handleRequestChanges}
/>
```

### 3. Real-time Content Checking
```javascript
// Check content as user types
const { checkContent } = useModeration();

const handleContentChange = async (content) => {
  const { passed, checks } = await checkContent(content);
  
  if (!passed) {
    // Show warning to user
  }
};
```

## Best Practices

### For Campaign Creators
1. **Be Specific**: Provide detailed descriptions and itemized budgets
2. **Include Documentation**: Mention receipts, invoices, medical reports
3. **Avoid Luxury Language**: Don't use words like "premium" or "deluxe"
4. **Show Faith**: Include scripture references and prayer requests
5. **Focus on Need**: Clearly explain why the help is needed

### For Administrators
1. **Review Flags**: Pay attention to specific flags raised by the system
2. **Check Context**: Sometimes legitimate needs may trigger false positives
3. **Document Decisions**: Always add notes when approving/rejecting
4. **Update Rules**: Add new patterns as fraud tactics evolve

## Security Considerations

1. **Pattern Updates**: Regularly update detection patterns
2. **False Positives**: Monitor and adjust sensitivity thresholds
3. **Manual Override**: Always allow human review for edge cases
4. **Audit Trail**: Keep complete history of all moderation decisions

## Performance

- Average processing time: 50-200ms per campaign
- Caching: Results stored for 24 hours
- Batch processing: Up to 100 campaigns simultaneously
- Real-time updates: Moderation status synced across platform

## Future Enhancements

1. **Machine Learning**: Train models on historical decisions
2. **Image Analysis**: Scan uploaded photos for inappropriate content
3. **Multi-language**: Support moderation in multiple languages
4. **Reputation System**: Factor in user history and trust scores
5. **API Integration**: External services for enhanced detection
