# Payment Service Specification

## Service Overview

The Payment Service is a critical microservice responsible for handling all financial transactions within the Blessed-Horizon platform.

## Architecture

### Technology Stack
- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0
- **Cache**: Redis 7+
- **Queue**: RabbitMQ for async processing
- **Payment Provider**: Stripe API
- **Monitoring**: Prometheus + Grafana

### Service Dependencies
- User Service (for user validation)
- Campaign Service (for campaign validation)
- Notification Service (for payment notifications)
- Audit Service (for compliance logging)

## API Specification

### Endpoints

#### Create Payment Intent
```http
POST /api/v1/payments/create-intent
Content-Type: application/json
Authorization: Bearer {token}

{
  "campaign_id": "uuid",
  "amount": 5000,  // in cents
  "currency": "usd",
  "metadata": {
    "dedication": "In memory of...",
    "anonymous": false
  }
}

Response:
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 5000,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

#### Confirm Payment
```http
POST /api/v1/payments/confirm
Content-Type: application/json
Authorization: Bearer {token}

{
  "payment_intent_id": "pi_xxx",
  "payment_method_id": "pm_xxx"
}

Response:
{
  "payment_id": "uuid",
  "status": "succeeded",
  "amount": 5000,
  "campaign_id": "uuid",
  "receipt_url": "https://..."
}
```

#### Get Payment History
```http
GET /api/v1/payments/history/{user_id}?page=1&limit=20
Authorization: Bearer {token}

Response:
{
  "payments": [
    {
      "id": "uuid",
      "amount": 5000,
      "currency": "usd",
      "campaign": {
        "id": "uuid",
        "title": "Help Build Water Wells"
      },
      "status": "succeeded",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Process Refund
```http
POST /api/v1/payments/refund
Content-Type: application/json
Authorization: Bearer {token}
X-Admin-Key: {admin_key}

{
  "payment_id": "uuid",
  "amount": 5000,  // optional, full refund if not specified
  "reason": "requested_by_customer",
  "notes": "User requested refund via support"
}

Response:
{
  "refund_id": "re_xxx",
  "payment_id": "uuid",
  "amount": 5000,
  "status": "succeeded",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Payment Analytics
```http
GET /api/v1/payments/analytics?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}
X-Admin-Key: {admin_key}

Response:
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "total_amount": 125000000,  // in cents
    "total_transactions": 2500,
    "average_donation": 50000,
    "unique_donors": 1800
  },
  "by_day": [
    {
      "date": "2024-01-01",
      "amount": 4500000,
      "transactions": 90
    }
  ],
  "by_campaign": [
    {
      "campaign_id": "uuid",
      "campaign_title": "Emergency Relief Fund",
      "amount": 35000000,
      "transactions": 700
    }
  ],
  "payment_methods": {
    "card": 0.85,
    "bank_account": 0.10,
    "digital_wallet": 0.05
  }
}
```

### Webhook Handlers

#### Stripe Webhook Handler
```http
POST /api/v1/payments/webhooks/stripe
Stripe-Signature: {signature}

// Handles events:
// - payment_intent.succeeded
// - payment_intent.payment_failed
// - charge.refunded
// - charge.dispute.created
```

## Database Schema

### Tables

#### payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_campaign_id ON payments(campaign_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

#### refunds
```sql
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(100),
    notes TEXT,
    stripe_refund_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL,
    initiated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### payment_methods
```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_payment_method_id VARCHAR(255) UNIQUE,
    type VARCHAR(50) NOT NULL,
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Business Logic

### Payment Processing Flow
1. **Validation**
   - Verify user authentication
   - Validate campaign exists and is active
   - Check minimum/maximum donation amounts
   - Verify user is not blocked

2. **Payment Intent Creation**
   - Create Stripe payment intent
   - Store intent details in database
   - Apply platform fee (2.9% + $0.30)
   - Return client secret to frontend

3. **Payment Confirmation**
   - Frontend confirms payment with Stripe
   - Webhook receives confirmation
   - Update payment status in database
   - Trigger post-payment actions

4. **Post-Payment Actions**
   - Update campaign raised amount
   - Send confirmation email
   - Update user donation history
   - Calculate trust score impact
   - Send notification to campaign creator

### Refund Processing
1. **Authorization**
   - Verify admin privileges
   - Check refund eligibility (within 30 days)
   - Validate refund amount

2. **Processing**
   - Create Stripe refund
   - Update payment status
   - Adjust campaign totals
   - Log refund reason

3. **Notifications**
   - Email donor about refund
   - Notify campaign creator
   - Update analytics

### Fee Structure
```python
class FeeCalculator:
    PLATFORM_PERCENTAGE = 0.029  # 2.9%
    PLATFORM_FIXED = 30  # 30 cents
    
    @staticmethod
    def calculate_fees(amount_cents: int) -> Dict[str, int]:
        stripe_fee = int(amount_cents * 0.029 + 30)
        platform_fee = int(amount_cents * 0.02)  # 2% to platform
        net_amount = amount_cents - stripe_fee - platform_fee
        
        return {
            "gross_amount": amount_cents,
            "stripe_fee": stripe_fee,
            "platform_fee": platform_fee,
            "net_amount": net_amount
        }
```

## Security Considerations

### Authentication & Authorization
- JWT tokens for API authentication
- Admin endpoints require additional API key
- Rate limiting per user and IP
- Webhook signature verification

### PCI Compliance
- No credit card data stored
- All sensitive data handled by Stripe
- TLS 1.3 for all connections
- Regular security audits

### Fraud Prevention
- Velocity checks (max donations per hour)
- Amount limits per transaction
- Geographic restrictions
- Suspicious pattern detection

## Performance Optimization

### Caching Strategy
- Redis cache for payment methods
- Campaign totals cached for 1 minute
- User donation history cached
- Analytics data pre-computed hourly

### Database Optimization
- Partitioned tables by month
- Read replicas for analytics
- Connection pooling
- Query optimization with EXPLAIN

### Async Processing
- Webhook processing queued
- Email notifications async
- Analytics computation background jobs
- Bulk export operations

## Monitoring & Alerting

### Key Metrics
- Payment success rate
- Average processing time
- Refund rate
- Failed payment reasons
- API response times

### Alerts
- Payment success rate < 95%
- Processing time > 2 seconds
- Refund rate > 5%
- Stripe webhook failures
- Database connection issues

### Logging
- All API requests logged
- Payment state transitions
- Error details with stack traces
- Audit log for admin actions

## Testing Strategy

### Unit Tests
- Fee calculation logic
- Payment validation rules
- Currency conversion
- Business logic functions

### Integration Tests
- Stripe API integration
- Database operations
- Cache operations
- Queue processing

### End-to-End Tests
- Complete payment flow
- Refund processing
- Webhook handling
- Analytics generation

### Load Testing
- 1000 concurrent payments
- Webhook burst handling
- Database connection limits
- Cache performance

## Deployment

### Docker Configuration
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@db:5432/payments
REDIS_URL=redis://redis:6379
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
JWT_SECRET_KEY=xxx
ADMIN_API_KEY=xxx
```

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": check_database(),
        "redis": check_redis(),
        "stripe": check_stripe_api()
    }
```

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups
- Transaction logs: Real-time replication
- Stripe data: Webhook replay capability

### Recovery Procedures
1. Database restoration from backup
2. Replay Stripe webhooks for gap
3. Reconciliation report generation
4. Manual review of edge cases

### Business Continuity
- Multi-region deployment
- Automatic failover
- Read-only mode capability
- Degraded service handling