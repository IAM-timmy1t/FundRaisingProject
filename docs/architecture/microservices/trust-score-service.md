# Trust Score Service Specification

## Service Overview

The Trust Score Service calculates and maintains trust scores for campaigns and users, providing transparency and accountability metrics for the Blessed-Horizon platform.

## Architecture

### Technology Stack
- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0
- **Cache**: Redis for real-time calculations
- **Task Queue**: Celery with Redis backend
- **ML Libraries**: scikit-learn, pandas, numpy
- **Monitoring**: Prometheus + Grafana

### Service Dependencies
- Campaign Service (campaign data)
- User Service (user history)
- Payment Service (donation patterns)
- Update Service (campaign updates)

## Trust Score Algorithm

### Components

#### Campaign Trust Score (0-100)
```python
class CampaignTrustScore:
    def calculate(self, campaign_id: UUID) -> TrustScore:
        components = {
            "completion_rate": self._calculate_completion_rate(campaign_id) * 0.25,
            "update_frequency": self._calculate_update_frequency(campaign_id) * 0.20,
            "donor_satisfaction": self._calculate_donor_satisfaction(campaign_id) * 0.20,
            "verification_status": self._calculate_verification_status(campaign_id) * 0.15,
            "historical_performance": self._calculate_historical_performance(campaign_id) * 0.10,
            "community_engagement": self._calculate_community_engagement(campaign_id) * 0.10
        }
        
        base_score = sum(components.values())
        adjusted_score = self._apply_penalties(base_score, campaign_id)
        
        return TrustScore(
            score=min(100, max(0, adjusted_score)),
            components=components,
            factors=self._get_factors(campaign_id),
            last_calculated=datetime.utcnow()
        )
```

#### User Trust Score (0-100)
```python
class UserTrustScore:
    def calculate(self, user_id: UUID) -> TrustScore:
        components = {
            "campaign_success_rate": self._calculate_campaign_success(user_id) * 0.30,
            "verification_level": self._calculate_verification_level(user_id) * 0.25,
            "platform_tenure": self._calculate_tenure_score(user_id) * 0.15,
            "community_feedback": self._calculate_feedback_score(user_id) * 0.15,
            "donation_history": self._calculate_donation_score(user_id) * 0.10,
            "response_time": self._calculate_response_score(user_id) * 0.05
        }
        
        base_score = sum(components.values())
        return TrustScore(
            score=min(100, max(0, base_score)),
            components=components,
            factors=self._get_user_factors(user_id),
            last_calculated=datetime.utcnow()
        )
```

### Calculation Details

#### Completion Rate Score
```python
def _calculate_completion_rate(self, campaign_id: UUID) -> float:
    """
    Score based on historical campaign completion rates
    """
    past_campaigns = self.get_user_past_campaigns(campaign_id)
    if not past_campaigns:
        return 50.0  # Neutral score for new users
    
    completed = sum(1 for c in past_campaigns if c.status == 'completed')
    completion_rate = completed / len(past_campaigns)
    
    # Apply scoring curve
    if completion_rate >= 0.9:
        return 100.0
    elif completion_rate >= 0.7:
        return 80.0 + (completion_rate - 0.7) * 100
    elif completion_rate >= 0.5:
        return 60.0 + (completion_rate - 0.5) * 100
    else:
        return completion_rate * 120
```

#### Update Frequency Score
```python
def _calculate_update_frequency(self, campaign_id: UUID) -> float:
    """
    Score based on how frequently campaign is updated
    """
    updates = self.get_campaign_updates(campaign_id)
    campaign = self.get_campaign(campaign_id)
    
    days_active = (datetime.utcnow() - campaign.created_at).days
    if days_active == 0:
        return 100.0  # New campaign
    
    expected_updates = days_active / 7  # Weekly updates expected
    actual_updates = len(updates)
    
    update_ratio = actual_updates / expected_updates if expected_updates > 0 else 0
    
    if update_ratio >= 1.0:
        return 100.0
    elif update_ratio >= 0.5:
        return 50.0 + (update_ratio * 50)
    else:
        return update_ratio * 100
```

#### Verification Levels
```python
class VerificationLevel(Enum):
    NONE = 0
    EMAIL_VERIFIED = 20
    PHONE_VERIFIED = 40
    ID_VERIFIED = 70
    ORGANIZATION_VERIFIED = 100
    
def _calculate_verification_status(self, campaign_id: UUID) -> float:
    user = self.get_campaign_creator(campaign_id)
    campaign = self.get_campaign(campaign_id)
    
    user_verification = user.verification_level.value
    
    # Bonus for campaign-specific verification
    campaign_verification = 0
    if campaign.has_documentation:
        campaign_verification += 20
    if campaign.has_media_proof:
        campaign_verification += 10
    
    return min(100, user_verification + campaign_verification)
```

## API Specification

### Endpoints

#### Get Campaign Trust Score
```http
GET /api/v1/trust/campaign/{campaign_id}
Authorization: Bearer {token}

Response:
{
  "campaign_id": "uuid",
  "score": 85,
  "rating": "excellent",
  "components": {
    "completion_rate": 22.5,
    "update_frequency": 18.0,
    "donor_satisfaction": 17.0,
    "verification_status": 12.0,
    "historical_performance": 8.5,
    "community_engagement": 7.0
  },
  "factors": [
    {
      "factor": "Regular updates",
      "impact": "positive",
      "weight": 0.20
    },
    {
      "factor": "New creator",
      "impact": "neutral",
      "weight": 0.10
    }
  ],
  "trend": {
    "direction": "up",
    "change": 5,
    "period": "7_days"
  },
  "last_calculated": "2024-01-15T10:30:00Z",
  "next_update": "2024-01-15T11:30:00Z"
}
```

#### Get User Trust Score
```http
GET /api/v1/trust/user/{user_id}
Authorization: Bearer {token}

Response:
{
  "user_id": "uuid",
  "score": 78,
  "rating": "good",
  "components": {
    "campaign_success_rate": 24.0,
    "verification_level": 17.5,
    "platform_tenure": 12.0,
    "community_feedback": 12.0,
    "donation_history": 8.0,
    "response_time": 4.5
  },
  "badges": [
    {
      "type": "verified_creator",
      "earned_at": "2023-12-01T00:00:00Z"
    },
    {
      "type": "consistent_updater",
      "earned_at": "2024-01-01T00:00:00Z"
    }
  ],
  "history": [
    {
      "date": "2024-01-15",
      "score": 78
    },
    {
      "date": "2024-01-08",
      "score": 75
    }
  ]
}
```

#### Calculate Trust Score (Admin)
```http
POST /api/v1/trust/calculate
Content-Type: application/json
Authorization: Bearer {token}
X-Admin-Key: {admin_key}

{
  "entity_type": "campaign",
  "entity_id": "uuid",
  "force_recalculation": true
}

Response:
{
  "entity_id": "uuid",
  "old_score": 82,
  "new_score": 85,
  "calculation_time_ms": 145,
  "factors_changed": [
    "update_frequency",
    "donor_satisfaction"
  ]
}
```

#### Get Trust Score Factors
```http
GET /api/v1/trust/factors/{entity_id}?entity_type=campaign
Authorization: Bearer {token}

Response:
{
  "entity_id": "uuid",
  "entity_type": "campaign",
  "positive_factors": [
    {
      "description": "Campaign has received 50+ donations",
      "impact_score": 10,
      "category": "engagement"
    },
    {
      "description": "Creator verified their identity",
      "impact_score": 15,
      "category": "verification"
    }
  ],
  "negative_factors": [
    {
      "description": "No updates in past 14 days",
      "impact_score": -5,
      "category": "communication"
    }
  ],
  "recommendations": [
    {
      "action": "Post a campaign update",
      "potential_impact": 5,
      "difficulty": "easy"
    }
  ]
}
```

#### Report Trust Issue
```http
POST /api/v1/trust/report
Content-Type: application/json
Authorization: Bearer {token}

{
  "entity_type": "campaign",
  "entity_id": "uuid",
  "issue_type": "suspicious_activity",
  "description": "Campaign appears to be misrepresenting the cause",
  "evidence_urls": [
    "https://example.com/evidence1",
    "https://example.com/evidence2"
  ]
}

Response:
{
  "report_id": "uuid",
  "status": "pending_review",
  "estimated_review_time": "24_hours",
  "impact": {
    "immediate_score_adjustment": -5,
    "pending_investigation": true
  }
}
```

## Database Schema

### Tables

#### trust_scores
```sql
CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'campaign' or 'user'
    entity_id UUID NOT NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    components JSONB NOT NULL,
    factors JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(entity_type, entity_id, version)
);

CREATE INDEX idx_trust_scores_entity ON trust_scores(entity_type, entity_id);
CREATE INDEX idx_trust_scores_calculated ON trust_scores(calculated_at);
```

#### trust_score_history
```sql
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    components JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_trust_history_entity ON trust_score_history(entity_type, entity_id);
CREATE INDEX idx_trust_history_date ON trust_score_history(calculated_at);
```

#### trust_reports
```sql
CREATE TABLE trust_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    action_taken VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);
```

## Calculation Engine

### Real-time Updates
```python
class TrustScoreEngine:
    def __init__(self):
        self.redis = Redis()
        self.db = Database()
        
    async def update_score_realtime(self, entity_type: str, entity_id: UUID, event: TrustEvent):
        """
        Update trust score based on real-time events
        """
        current_score = await self.get_cached_score(entity_type, entity_id)
        
        adjustment = self.calculate_event_impact(event)
        new_score = max(0, min(100, current_score + adjustment))
        
        # Update cache immediately
        await self.redis.setex(
            f"trust:{entity_type}:{entity_id}",
            300,  # 5 minute TTL
            new_score
        )
        
        # Queue full recalculation
        await self.queue_recalculation(entity_type, entity_id)
        
        return new_score
```

### Batch Processing
```python
@celery_app.task
def recalculate_all_scores():
    """
    Periodic task to recalculate all trust scores
    """
    # Process campaigns
    campaigns = db.query(Campaign).filter(Campaign.status == 'active').all()
    for campaign in campaigns:
        calculate_campaign_trust_score.delay(campaign.id)
    
    # Process users with active campaigns
    users = db.query(User).join(Campaign).filter(Campaign.status == 'active').distinct().all()
    for user in users:
        calculate_user_trust_score.delay(user.id)
```

### Machine Learning Integration
```python
class TrustScoreML:
    def __init__(self):
        self.model = self.load_model()
        
    def predict_campaign_success(self, campaign_data: Dict) -> float:
        """
        ML model to predict campaign success probability
        """
        features = self.extract_features(campaign_data)
        prediction = self.model.predict_proba(features)[0][1]
        return prediction * 100
    
    def extract_features(self, campaign_data: Dict) -> np.ndarray:
        return np.array([
            campaign_data['creator_score'],
            campaign_data['goal_amount'],
            campaign_data['description_length'],
            campaign_data['media_count'],
            campaign_data['update_frequency'],
            campaign_data['category_success_rate']
        ])
```

## Performance Optimization

### Caching Strategy
- Current scores cached in Redis (5 min TTL)
- Historical data cached for 1 hour
- Calculation results cached for 30 minutes
- Component scores cached separately

### Database Optimization
- Materialized views for aggregations
- Partitioning by month for history
- Async calculation with Celery
- Batch updates for efficiency

## Monitoring

### Metrics
- Average trust score by category
- Score calculation time
- Cache hit rate
- Report processing time
- Score volatility metrics

### Alerts
- Sudden score drops > 20 points
- High volume of trust reports
- Calculation failures
- Cache performance issues

## Security & Privacy

### Access Control
- Users can only see their own detailed scores
- Public can see aggregate scores
- Admins can see all scores and reports
- Rate limiting on score queries

### Data Privacy
- No PII in trust calculations
- Anonymous reporting supported
- GDPR-compliant data retention
- Audit trail for all changes