# Uptime Monitoring Setup

## External Monitoring Services

### 1. StatusCake Setup

1. Create account at https://www.statuscake.com
2. Add new uptime test:
   - URL: https://blessed-horizon.com
   - Check Rate: 1 minute
   - Test Type: HTTP
   - Alert After: 2 failures
   - Contact Groups: DevOps Team

3. Add additional checks:
   - API Health: https://blessed-horizon.com/api/health
   - Payment Webhook: https://blessed-horizon.com/api/v1/webhooks/stripe
   - Static Assets: https://blessed-horizon.com/assets/main.js

### 2. Pingdom Configuration

1. Create account at https://www.pingdom.com
2. Add transaction check:
   ```javascript
   // Donation Flow Check
   go.to('https://blessed-horizon.com');
   go.click('Browse Campaigns');
   go.click('first campaign');
   go.click('Donate Now');
   go.checkForText('Select Payment Method');
   ```

3. Set up alerts:
   - SMS for critical services
   - Email for warnings
   - Slack integration for all alerts

### 3. UptimeRobot Setup

1. Create monitors at https://uptimerobot.com
2. Monitor types:
   - HTTP(s) - Main site
   - Port - Database (5432)
   - Keyword - Check for "Blessed-Horizon" on homepage
   - API - Health endpoint

### 4. Better Uptime Configuration

1. Create monitors at https://betteruptime.com
2. Advanced checks:
   ```yaml
   - name: Donation API
     url: https://blessed-horizon.com/api/v1/donations
     method: POST
     headers:
       Content-Type: application/json
     body: |
       {
         "amount": 100,
         "campaign_id": "test"
       }
     expected_status: [200, 401]
   ```

## Status Page Setup

### 1. Create Public Status Page

Using Statuspage.io or Better Uptime:

```yaml
components:
  - name: Website
    description: Main blessed-horizon.com site
  - name: API
    description: REST API endpoints
  - name: Payment Processing
    description: Stripe integration
  - name: Database
    description: PostgreSQL database
  - name: File Storage
    description: Supabase storage
```

### 2. Incident Communication

Template for incident updates:

```markdown
## Incident: [Service] Degraded Performance

**Status**: Investigating | Identified | Monitoring | Resolved

**Impact**: 
- Affected services: [List services]
- User impact: [Description]
- Duration: [Start time - End time]

**Updates**:
- [Time]: Initial detection
- [Time]: Root cause identified
- [Time]: Fix implemented
- [Time]: Service restored

**Root Cause**: [Technical explanation]

**Action Items**:
- [ ] Post-mortem meeting
- [ ] Update monitoring
- [ ] Implement preventive measures
```

## Synthetic Monitoring

### Critical User Journeys

1. **Campaign Creation Flow**
   ```javascript
   // Puppeteer script
   await page.goto('https://blessed-horizon.com');
   await page.click('[data-test="create-campaign"]');
   await page.type('#title', 'Test Campaign');
   await page.type('#description', 'Test description');
   await page.type('#goal', '1000');
   await page.click('[data-test="submit"]');
   await page.waitForSelector('[data-test="success-message"]');
   ```

2. **Donation Flow**
   ```javascript
   await page.goto('https://blessed-horizon.com/campaigns/123');
   await page.click('[data-test="donate-button"]');
   await page.type('#amount', '50');
   await page.click('[data-test="payment-method-card"]');
   // Stripe checkout flow
   await page.waitForSelector('[data-test="donation-success"]');
   ```

3. **Search and Discovery**
   ```javascript
   await page.goto('https://blessed-horizon.com/campaigns');
   await page.type('#search', 'medical');
   await page.keyboard.press('Enter');
   await page.waitForSelector('[data-test="search-results"]');
   const results = await page.$$('[data-test="campaign-card"]');
   assert(results.length > 0);
   ```

## Alert Escalation

### Severity Levels

1. **Critical** (Page immediately)
   - Site completely down
   - Payment processing failure
   - Data breach detected
   - Database unreachable

2. **High** (Alert within 15 min)
   - API errors > 10%
   - Response time > 2s
   - Search functionality broken
   - Trust score calculation failing

3. **Medium** (Alert within 1 hour)
   - Specific endpoint slow
   - Cache hit rate < 80%
   - Non-critical service degraded

4. **Low** (Daily summary)
   - Performance degradation < 10%
   - Non-critical errors
   - Planned maintenance reminders

### On-Call Rotation

```yaml
rotation:
  primary:
    - name: DevOps Lead
      phone: +1-xxx-xxx-xxxx
      hours: Mon-Fri 9am-5pm EST
  secondary:
    - name: Backend Lead
      phone: +1-xxx-xxx-xxxx
      hours: Nights/Weekends
  escalation:
    - after: 15 minutes
      contact: Engineering Manager
    - after: 30 minutes
      contact: CTO
```

## Monitoring Checklist

- [ ] StatusCake account created and configured
- [ ] Pingdom transaction checks active
- [ ] UptimeRobot monitors set up
- [ ] Better Uptime API checks configured
- [ ] Status page published at status.blessed-horizon.com
- [ ] Alert contacts verified
- [ ] Escalation policy documented
- [ ] Synthetic monitoring scripts deployed
- [ ] On-call rotation scheduled
- [ ] Incident response playbooks created