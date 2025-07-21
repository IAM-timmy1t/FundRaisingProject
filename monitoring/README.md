# Blessed-Horizon Monitoring Setup

This directory contains comprehensive monitoring configurations for the Blessed-Horizon platform.

## Overview

Our monitoring stack includes:

1. **Error Tracking**: Sentry
2. **APM (Application Performance Monitoring)**: Datadog APM, New Relic
3. **Metrics**: Prometheus + Grafana
4. **Analytics**: Google Analytics 4, Segment, Mixpanel, Amplitude
5. **Real User Monitoring**: Datadog RUM
6. **Uptime Monitoring**: External services (StatusCake, Pingdom)

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` files:

```bash
# Sentry
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Datadog
DD_API_KEY=your_datadog_api_key
DD_APP_KEY=your_datadog_app_key
VITE_DATADOG_APPLICATION_ID=your_rum_application_id
VITE_DATADOG_CLIENT_TOKEN=your_rum_client_token

# New Relic
NEW_RELIC_LICENSE_KEY=your_new_relic_license_key
NEW_RELIC_APP_NAME=blessed-horizon

# Analytics
VITE_GA4_MEASUREMENT_ID=your_ga4_measurement_id
SEGMENT_WRITE_KEY=your_segment_write_key
VITE_MIXPANEL_PROJECT_TOKEN=your_mixpanel_token
VITE_AMPLITUDE_API_KEY=your_amplitude_api_key
```

### 2. Server Integration

In your main server file (`server.js` or `app.js`):

```javascript
import { initializeMonitoring } from './monitoring/index.js';

// Initialize monitoring before other middleware
const app = express();
initializeMonitoring(app);
```

### 3. Client Integration

In your main client file (`main.jsx` or `App.jsx`):

```javascript
import { initializeBrowserMonitoring } from './monitoring/index.js';

// Initialize browser monitoring
initializeBrowserMonitoring();
```

### 4. Prometheus & Grafana Setup

#### Install Prometheus

1. Download Prometheus from https://prometheus.io/download/
2. Configure `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'blessed-horizon'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

3. Start Prometheus:
```bash
./prometheus --config.file=prometheus.yml
```

#### Install Grafana

1. Download Grafana from https://grafana.com/grafana/download
2. Start Grafana (default port 3000)
3. Add Prometheus as a data source
4. Import the dashboard from `grafana-dashboard.json`

### 5. Alerts Configuration

#### Sentry Alerts

1. Go to Sentry project settings
2. Configure alerts for:
   - Error rate spikes
   - New error types
   - Performance degradation
   - User impact thresholds

#### Datadog Monitors

1. Create monitors for:
   - API response time > 500ms
   - Error rate > 1%
   - Database query time > 100ms
   - Payment processing failures

#### Prometheus Alerts

Add to `prometheus.yml`:

```yaml
rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

### 6. Custom Metrics

Track business metrics in your code:

```javascript
import prometheus from './monitoring/prometheus.config.js';
import analytics from './monitoring/analytics.config.js';

// Track donation
prometheus.recordDonation(amount, campaignId, 'stripe');
analytics.trackDonation(amount, campaignId, 'stripe');

// Track campaign progress
prometheus.updateCampaignProgress(campaignId, campaignName, 75);

// Track trust score
prometheus.updateTrustScore(campaignId, campaignName, 85);
```

## Monitoring Dashboards

### Key Metrics to Monitor

1. **Application Health**
   - Response time (p50, p95, p99)
   - Error rate
   - Request rate
   - Active users

2. **Business Metrics**
   - Donation volume
   - Campaign creation rate
   - Trust score distribution
   - User engagement

3. **Infrastructure**
   - CPU usage
   - Memory usage
   - Database connections
   - Cache hit rate

4. **User Experience**
   - Page load time
   - Core Web Vitals
   - JavaScript errors
   - API latency

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check if monitoring services are initialized
   - Verify environment variables are set
   - Check network connectivity

2. **High error rates**
   - Check Sentry for error details
   - Review recent deployments
   - Check database/cache health

3. **Performance degradation**
   - Review APM traces
   - Check database query performance
   - Monitor cache hit rates
   - Review recent code changes

## Best Practices

1. **Use structured logging**
   ```javascript
   logger.info('Donation processed', {
     amount,
     campaignId,
     userId,
     duration,
   });
   ```

2. **Add context to errors**
   ```javascript
   Sentry.withScope(scope => {
     scope.setContext('campaign', { id: campaignId });
     Sentry.captureException(error);
   });
   ```

3. **Track user journeys**
   ```javascript
   analytics.track('Donation Flow Started');
   analytics.track('Payment Method Selected');
   analytics.track('Donation Completed');
   ```

4. **Monitor SLIs (Service Level Indicators)**
   - Availability > 99.9%
   - Response time < 200ms (p95)
   - Error rate < 0.1%

## Security Considerations

1. **Never log sensitive data**
   - No passwords, tokens, or API keys
   - No payment card information
   - No personally identifiable information (PII)

2. **Use sampling for high-volume metrics**
   - Sample traces at 10% in production
   - Full sampling in staging/development

3. **Secure metric endpoints**
   - Protect `/metrics` endpoint with authentication
   - Use HTTPS for all monitoring data

## Maintenance

1. **Regular reviews**
   - Weekly: Review error trends
   - Monthly: Review performance metrics
   - Quarterly: Update alert thresholds

2. **Clean up old data**
   - Configure retention policies
   - Archive old metrics
   - Remove unused dashboards

3. **Update dependencies**
   - Keep monitoring SDKs updated
   - Review security advisories
   - Test updates in staging first