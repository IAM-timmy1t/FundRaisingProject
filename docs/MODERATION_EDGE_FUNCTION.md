# Campaign Moderation Edge Function

## Overview

The Campaign Moderation Edge Function provides automated content screening for campaigns to detect:
- Luxury/lavish items and requests
- Inappropriate or prohibited content
- Fraud patterns and suspicious behavior
- Trust indicators and transparency markers

## Architecture

### Edge Function Details
- **Name**: `moderate-campaign`
- **Runtime**: Deno
- **Trigger**: Automatic on campaign creation/update or manual invocation
- **Processing Time**: ~200-500ms average

### Scoring System

The moderation system uses a weighted scoring algorithm:

1. **Luxury Score** (0-100) - Weight: -25%
   - Detects luxury brands, expensive items, vacation requests
   - High individual item amounts (>$1,000 for non-medical)
   - Total goal amounts >$50,000

2. **Inappropriate Score** (0-100) - Weight: -35%
   - Scam/fraud keywords
   - Prohibited content (drugs, weapons, adult content)
   - Hate speech or discrimination

3. **Fraud Score** (0-100) - Weight: -30%
   - Suspicious financial patterns
   - Excessive urgency without justification
   - Missing or vague budget breakdowns
   - Round numbers only (potential fake)

4. **Need Validation** (0-100) - Weight: +20%
   - Medical campaigns must mention hospitals, treatments
   - Education must reference schools, tuition
   - Emergency must have detailed explanations

5. **Trust Score** (0-100) - Weight: +20%
   - Transparency indicators (receipts, documentation)
   - Faith/scripture references
   - Community support mentions

### Decision Logic

- **Score ≥ 70**: Approved ✅
- **Score 40-69**: Manual Review Required 🔍
- **Score < 40**: Rejected ❌

## API Usage

### Endpoint
```
POST /functions/v1/moderate-campaign
```

### Request Body
```typescript
{
  // Option 1: Provide campaign ID
  campaignId: string;
  
  // Option 2: Provide full campaign object
  campaign: {
    id: string;
    title: string;
    story: string;
    description?: string;
    need_type: string;
    goal_amount: number;
    budget_breakdown: Array<{
      item: string;
      amount: number;
      description?: string;
    }>;
  }
}
```

### Response
```typescript
{
  success: boolean;
  result?: {
    campaignId: string;
    timestamp: string;
    processingTime: number;
    scores: {
      luxury: number;
      inappropriate: number;
      fraud: number;
      needValidation: number;
      trust: number;
      overall: number;
    };
    decision: 'approved' | 'review' | 'rejected';
    flags: string[];
    recommendations: string[];
    details: {
      luxuryItems: string[];
      inappropriateContent: string[];
      suspiciousPatterns: string[];
      trustIndicators: Array<{
        category: string;
        found: boolean;
      }>;
    };
  };
  error?: string;
}
```

## Database Schema

### campaign_moderation Table
```sql
campaign_id: UUID (FK to campaigns)
moderation_score: INTEGER (0-100)
decision: TEXT ('approved', 'review', 'rejected', 'error')
flags: TEXT[]
details: JSONB
recommendations: TEXT[]
processing_time: INTEGER (milliseconds)
reviewed_by: UUID (for manual reviews)
review_notes: TEXT
moderated_at: TIMESTAMPTZ
```

## Deployment

### Deploy Edge Function
```bash
supabase functions deploy moderate-campaign
```

### Set Secrets
```bash
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Testing

### Local Testing
```bash
# Serve function locally
supabase functions serve moderate-campaign

# Test with curl
curl -i --request POST \
  --url http://localhost:54321/functions/v1/moderate-campaign \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "campaign": {
      "id": "test-123",
      "title": "Help Fund Medical Treatment",
      "story": "Need help for surgery at hospital...",
      "need_type": "medical",
      "goal_amount": 10000,
      "budget_breakdown": [
        {"item": "Surgery", "amount": 8000},
        {"item": "Medicine", "amount": 2000}
      ]
    }
  }'
```

### Integration Testing
Use the provided test script:
```bash
node test-moderation-edge-function.js
```

## Monitoring

### Key Metrics
- Average processing time
- Decision distribution (approved/review/rejected)
- Most common flags
- False positive/negative rates

### Query Moderation Stats
```sql
SELECT * FROM get_moderation_stats(
  start_date := NOW() - INTERVAL '7 days',
  end_date := NOW()
);
```

## Best Practices

1. **Campaign Guidelines**
   - Educate users about prohibited content before submission
   - Provide examples of good vs. problematic campaigns
   - Show moderation score feedback during creation

2. **Manual Review Process**
   - Prioritize high-value campaigns
   - Review campaigns with scores 40-69
   - Document review decisions for consistency

3. **Continuous Improvement**
   - Monitor false positives/negatives
   - Adjust scoring weights based on data
   - Add new patterns as threats emerge

## Security Considerations

- Edge function uses service role key (keep secure)
- RLS policies restrict access to moderation data
- Automatic trigger prevents bypassing moderation
- All decisions are logged for audit trail

## Performance Optimization

- Pattern matching is optimized with RegExp compilation
- Parallel processing of different checks
- Database writes are non-blocking
- Average latency: 200-500ms

## Future Enhancements

1. **AI/ML Integration**
   - GPT-based content analysis
   - Image recognition for uploaded media
   - Sentiment analysis

2. **Advanced Patterns**
   - Location-based validation
   - Cross-reference with known scam databases
   - Social media verification

3. **User Feedback Loop**
   - Learn from manual review decisions
   - Adjust scoring based on outcomes
   - Community reporting integration
