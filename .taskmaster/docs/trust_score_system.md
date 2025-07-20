# Trust Score System Documentation
## Blessed-Horizon Platform

### Overview
The Trust Score System is a sophisticated algorithm that evaluates and scores users based on their behavior, transparency, and reliability on the Blessed-Horizon platform. It provides donors with confidence indicators and helps maintain platform integrity.

## Trust Score Algorithm

### **Weighted Scoring Model**
The trust score is calculated using five key metrics with specific weights:

| Metric | Weight | Description |
|--------|--------|-------------|
| **Update Timeliness** | 40% | Consistency and frequency of campaign updates |
| **Spend Proof Accuracy** | 30% | Transparency in financial reporting with receipts |
| **Donor Sentiment** | 15% | Feedback and ratings from donors |
| **KYC Depth** | 10% | Level of identity verification completed |
| **Anomaly Score** | 5% | Absence of suspicious or fraudulent behavior |

### **Trust Tiers**
Users are categorized into trust tiers based on their calculated score:

| Tier | Score Range | Description | Benefits |
|------|-------------|-------------|----------|
| **⭐ STAR** | 90-100 | Exceptional transparency and reliability | Maximum visibility, premium features |
| **🔵 TRUSTED** | 75-89 | Consistently reliable with good track record | Enhanced visibility, faster fund release |
| **🟢 STEADY** | 50-74 | Reliable with room for improvement | Standard features, normal fund release |
| **🟡 RISING** | 25-49 | Building trust, showing improvement | Basic features, monitored fund release |
| **🔴 NEW** | 0-24 | New user or needs significant improvement | Limited features, delayed fund release |

## Metric Calculations

### **1. Update Timeliness (40%)**
Measures how consistently users provide campaign updates according to platform requirements.

**Calculation Logic:**
- **Emergency campaigns**: Updates required every 7 days
- **Long-term campaigns**: Updates required every 14 days
- **Scoring factors**:
  - Meeting update deadlines: +90 points
  - Updates within grace period (1.5x deadline): +75 points
  - Acceptable delays: +60 points
  - Missing updates: -15 points per missed update
  - Overdue updates: -20 points per overdue update

**Example:**
```typescript
// User with emergency campaign created 21 days ago
// Expected: 3 updates (every 7 days)
// Actual: 2 updates (latest 5 days ago)
// Score: 75 (good recent update, but missing one)
```

### **2. Spend Proof Accuracy (30%)**
Evaluates transparency in financial reporting and documentation.

**Calculation Logic:**
- **Spend tracking**: Amount of spending documented with updates
- **Proof provision**: Receipts, payment references, or documentation
- **Accuracy percentage**: (Spending with proof / Total spending) × 100
- **Scoring**: Direct percentage conversion (0-100)

**Example:**
```typescript
// User reported £500 in spending
// £400 had receipts/references (80% accuracy)
// Score: 80 points
```

### **3. Donor Sentiment (15%)**
Analyzes feedback and ratings from donors who have supported campaigns.

**Calculation Logic:**
- **Donation feedback**: 1-5 star ratings converted to 20-100 scale
- **Comment sentiment**: AI-analyzed sentiment scores (if available)
- **Weighted average**: Based on donation amounts and recency
- **Default score**: 70 for users without feedback

**Example:**
```typescript
// 5 donations with ratings: [5, 4, 5, 3, 4]
// Converted scores: [100, 80, 100, 60, 80]
// Average: 84 points
```

### **4. KYC Depth (10%)**
Measures the level of identity verification completed.

**Verification Levels:**
- **Unverified**: 0 points
- **Email verified**: 20 points
- **Phone verified**: 40 points
- **ID verified**: 70 points
- **Full KYC**: 100 points

### **5. Anomaly Score (5%)**
Detects and penalizes suspicious or unusual behavior patterns.

**Anomaly Detection:**
- **Negative events**: Funds misuse, negative reviews, late updates (-15 each)
- **Too many active campaigns**: >3 active campaigns (-10 per extra)
- **Rapid campaign creation**: >2 campaigns in 7 days (-20)
- **Base score**: 100 (perfect behavior)

## Automatic Triggers

### **Real-time Calculation Triggers**
Trust scores are automatically recalculated when:

1. **Campaign Updates**: New update posted or modified
2. **Donations Received**: New donation or donor feedback
3. **Verification Changes**: KYC status updated
4. **Campaign Status Changes**: Campaign published, completed, etc.

### **Trigger Implementation**
```sql
-- Automatic trigger on campaign updates
CREATE TRIGGER trust_score_campaign_updates
    AFTER INSERT OR UPDATE OR DELETE ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_trust_score_calculation();
```

## API Functions

### **Manual Calculation**
```sql
-- Recalculate trust score for specific user
SELECT public.recalculate_trust_score('user-uuid-here');
```

### **Batch Processing**
```sql
-- Recalculate scores for users with outdated scores
SELECT public.batch_recalculate_trust_scores(100);
```

### **Trust Score History**
```sql
-- Get 30-day trust score history
SELECT * FROM public.get_trust_score_history('user-uuid', 30);
```

### **Analytics**
```sql
-- Get platform-wide trust score analytics
SELECT * FROM public.get_trust_score_analytics();
```

## Edge Function Integration

### **Supabase Edge Function**
The trust score calculation is performed by a Deno-based Edge Function:

**Endpoint**: `/functions/v1/trust-score-calculator`

**Request Format**:
```json
{
  "recipient_id": "uuid",
  "trigger_event": "TIMELY_UPDATE"
}
```

**Response Format**:
```json
{
  "trustScore": 78.5,
  "trustTier": "TRUSTED",
  "metrics": {
    "updateTimeliness": 85,
    "spendProofAccuracy": 90,
    "donorSentiment": 75,
    "kycDepth": 70,
    "anomalyScore": 95
  },
  "confidence": 85,
  "recommendations": [
    "Great work! Keep maintaining your excellent trust score"
  ]
}
```

## Security and Privacy

### **Data Protection**
- Trust score calculations respect RLS policies
- Personal data is protected during calculation
- Audit trail maintained for all score changes

### **Calculation Transparency**
- Users can view their trust score breakdown
- Historical changes are tracked and viewable
- Recommendations provided for improvement

### **Fraud Prevention**
- Anomaly detection identifies suspicious patterns
- Rate limiting prevents score manipulation
- Manual review triggers for significant changes

## Performance Optimization

### **Database Indexes**
```sql
-- Optimized indexes for trust score queries
CREATE INDEX idx_trust_score_events_user_date 
    ON trust_score_events(user_id, created_at DESC);

CREATE INDEX idx_user_profiles_trust_score 
    ON user_profiles(trust_score DESC);
```

### **Caching Strategy**
- Trust scores cached in user profiles
- Recalculation only on relevant events
- Batch processing for maintenance

### **Async Processing**
- Calculations performed asynchronously
- Non-blocking trigger implementation
- Queue-based processing for high volume

## Monitoring and Analytics

### **Trust Score Distribution**
Monitor platform health through trust score analytics:

```sql
-- Current distribution across tiers
SELECT trust_tier, COUNT(*), AVG(trust_score)
FROM user_profiles 
GROUP BY trust_tier;
```

### **Calculation Performance**
- Monitor Edge Function execution times
- Track calculation success rates
- Alert on calculation failures

### **User Behavior Insights**
- Identify patterns in trust score changes
- Analyze correlation with donation success
- Track improvement trends

## Recommendations System

### **Automated Recommendations**
The system provides personalized recommendations based on metric scores:

**Low Update Timeliness**:
- "Post regular updates to improve your timeliness score"

**Low Spend Proof Accuracy**:
- "Include receipts and payment references in your spending updates"

**Low KYC Depth**:
- "Complete your identity verification to increase trust"

**Low Donor Sentiment**:
- "Engage more with your donors and respond to their feedback"

**Overall Low Score**:
- "Focus on consistent communication and transparency to build trust"

## Testing and Validation

### **Comprehensive Test Suite**
Located in `supabase/tests/trust_score_tests.sql`:

- **Calculation accuracy tests**
- **Trigger functionality tests**
- **Edge case handling tests**
- **Performance benchmarks**
- **Data integrity validation**

### **Test Scenarios**
1. New user with no data
2. Active user with multiple campaigns
3. User with mixed performance metrics
4. Edge cases (invalid data, missing records)
5. Performance with large datasets

## Maintenance Procedures

### **Regular Maintenance**
1. **Weekly**: Review calculation performance and errors
2. **Monthly**: Analyze trust score distribution and trends
3. **Quarterly**: Review and adjust algorithm weights if needed
4. **Annually**: Comprehensive algorithm effectiveness review

### **Data Cleanup**
```sql
-- Clean up old trust score events (automated)
SELECT public.cleanup_old_audit_logs();
```

### **Algorithm Updates**
When updating the algorithm:
1. Test changes in development environment
2. Run A/B tests with subset of users
3. Gradually roll out changes
4. Monitor impact on user behavior

## Future Enhancements

### **Planned Improvements**
1. **Machine Learning Integration**: AI-powered anomaly detection
2. **Social Trust Signals**: Incorporate social media verification
3. **Peer Review System**: Allow community feedback on campaigns
4. **Dynamic Weights**: Adjust weights based on campaign type
5. **Predictive Scoring**: Predict future trust score trends

### **Advanced Analytics**
1. **Trust Score Prediction**: Forecast score changes
2. **Donor Matching**: Match donors with trusted recipients
3. **Risk Assessment**: Identify high-risk campaigns early
4. **Success Correlation**: Analyze trust score impact on funding success

---

**Last Updated**: 2024-01-XX  
**Version**: 1.0  
**Next Review**: Monthly algorithm performance review