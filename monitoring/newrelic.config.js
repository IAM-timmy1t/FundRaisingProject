// New Relic Application Performance Monitoring
'use strict';

/**
 * New Relic agent configuration.
 *
 * This file should be saved as newrelic.js in the root of your project.
 */
exports.config = {
  app_name: ['blessed-horizon', 'blessed-horizon-production'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
    filepath: 'stdout',
  },
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    metrics: {
      enabled: true,
    },
    local_decorating: {
      enabled: false,
    },
  },
  slow_sql: {
    enabled: true,
    max_samples: 10,
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500,
  },
  rules: {
    ignore: [
      '^/api/health$',
      '^/api/metrics$',
      '^/favicon.ico$',
      '^/robots.txt$',
    ],
  },
  attributes: {
    include: [
      'request.headers.user-agent',
      'request.headers.referer',
      'response.headers.content-type',
      'campaign.id',
      'user.id',
      'donation.amount',
    ],
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key',
    ],
  },
  browser_monitoring: {
    enable: true,
    loader: 'spa',
    // Custom attributes for browser monitoring
    attributes: {
      enabled: true,
      include: ['campaign.id', 'user.role', 'page.type'],
    },
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404, 401],
    expected_classes: ['ValidationError', 'AuthenticationError'],
  },
  // Custom instrumentation
  api: {
    custom_attributes_enabled: true,
    custom_events_enabled: true,
    custom_metrics_enabled: true,
  },
};

// Custom instrumentation module
export const customInstrumentation = (newrelic) => {
  // Track donation transactions
  const trackDonation = (amount, campaignId, userId, paymentMethod) => {
    newrelic.recordMetric('Custom/Donation/Amount', amount);
    newrelic.recordMetric('Custom/Donation/Count', 1);
    newrelic.addCustomAttributes({
      donationAmount: amount,
      campaignId: campaignId,
      userId: userId,
      paymentMethod: paymentMethod,
    });
  };

  // Track campaign performance
  const trackCampaignView = (campaignId, userId) => {
    newrelic.recordMetric('Custom/Campaign/Views', 1);
    newrelic.addCustomAttributes({
      campaignId: campaignId,
      viewerUserId: userId,
    });
  };

  // Track trust score calculations
  const trackTrustScoreCalculation = (campaignId, score, duration) => {
    newrelic.recordMetric('Custom/TrustScore/Calculation/Duration', duration);
    newrelic.recordMetric('Custom/TrustScore/Value', score);
    newrelic.addCustomAttributes({
      campaignId: campaignId,
      trustScore: score,
    });
  };

  // Track API performance
  const trackAPICall = (endpoint, method, duration, status) => {
    newrelic.recordMetric(`Custom/API/${method}/${endpoint}/Duration`, duration);
    newrelic.recordMetric(`Custom/API/${method}/${endpoint}/Count`, 1);
    if (status >= 400) {
      newrelic.recordMetric(`Custom/API/${method}/${endpoint}/Errors`, 1);
    }
  };

  // Track database performance
  const trackDatabaseQuery = (operation, table, duration) => {
    newrelic.recordMetric(`Custom/Database/${operation}/${table}/Duration`, duration);
    newrelic.recordMetric(`Custom/Database/${operation}/${table}/Count`, 1);
  };

  // Track cache performance
  const trackCacheOperation = (operation, key, hit, duration) => {
    newrelic.recordMetric(`Custom/Cache/${operation}/Duration`, duration);
    newrelic.recordMetric(`Custom/Cache/${operation}/${hit ? 'Hit' : 'Miss'}`, 1);
  };

  // Track user sessions
  const trackUserSession = (userId, sessionDuration, pageViews) => {
    newrelic.recordMetric('Custom/User/SessionDuration', sessionDuration);
    newrelic.recordMetric('Custom/User/PageViews', pageViews);
    newrelic.addCustomAttributes({
      userId: userId,
      sessionDuration: sessionDuration,
      pageViews: pageViews,
    });
  };

  return {
    trackDonation,
    trackCampaignView,
    trackTrustScoreCalculation,
    trackAPICall,
    trackDatabaseQuery,
    trackCacheOperation,
    trackUserSession,
  };
};