// Datadog APM and RUM Configuration
import tracer from 'dd-trace';
import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

// Initialize APM tracer
export function initDatadogAPM() {
  tracer.init({
    service: 'blessed-horizon',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    analytics: true,
    logInjection: true,
    profiling: true,
    runtimeMetrics: true,
    // Custom tags
    tags: {
      app: 'blessed-horizon',
      team: 'platform',
      region: process.env.AWS_REGION || 'us-east-1',
    },
    // Sampling rules
    sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Service mapping
    serviceMapping: {
      'postgres': 'blessed-horizon-db',
      'redis': 'blessed-horizon-cache',
      'stripe': 'payment-service',
    },
  });

  // Custom span processors
  tracer.use('express', {
    hooks: {
      request: (span, req) => {
        span.setTag('http.url', req.url);
        span.setTag('user.id', req.user?.id || 'anonymous');
      },
    },
  });

  // Database monitoring
  tracer.use('pg', {
    service: 'blessed-horizon-db',
    analytics: true,
  });

  return tracer;
}

// Initialize RUM (Real User Monitoring)
export function initDatadogRUM() {
  datadogRum.init({
    applicationId: process.env.VITE_DATADOG_APPLICATION_ID,
    clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    service: 'blessed-horizon-frontend',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
    // Custom RUM parameters
    beforeSend: (event, context) => {
      // Add custom attributes
      event.context = {
        ...event.context,
        campaign_id: window.currentCampaignId,
        user_role: window.currentUserRole,
      };
      return true;
    },
  });

  // Initialize logs
  datadogLogs.init({
    clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  });

  // Custom RUM actions
  datadogRum.addAction('donation_started', {
    campaign_id: window.currentCampaignId,
    amount: window.currentDonationAmount,
  });
}

// Custom metrics
export const recordMetric = (metric, value, tags = {}) => {
  tracer.dogstatsd.gauge(metric, value, tags);
};

// Business metrics
export const trackDonation = (amount, campaignId, userId) => {
  recordMetric('donations.amount', amount, {
    campaign_id: campaignId,
    user_id: userId,
  });
  recordMetric('donations.count', 1, {
    campaign_id: campaignId,
  });
};

// Performance metrics
export const trackApiLatency = (endpoint, duration) => {
  recordMetric('api.latency', duration, {
    endpoint,
  });
};

// Error tracking
export const trackError = (error, context = {}) => {
  datadogLogs.logger.error(error.message, {
    error,
    ...context,
  });
};

export default { initDatadogAPM, initDatadogRUM, recordMetric };