// Central Monitoring Integration
import express from 'express';
import { initSentry } from './sentry.config.js';
import { initDatadogAPM, initDatadogRUM } from './datadog.config.js';
import prometheus from './prometheus.config.js';
import newrelic from 'newrelic';
import analytics from './analytics.config.js';

// Initialize all monitoring services
export function initializeMonitoring(app) {
  console.log('🚀 Initializing monitoring services...');

  // Initialize New Relic (must be first)
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    console.log('✅ New Relic APM initialized');
  }

  // Initialize Datadog APM
  if (process.env.DD_API_KEY) {
    initDatadogAPM();
    console.log('✅ Datadog APM initialized');
  }

  // Initialize Sentry Error Tracking
  if (process.env.SENTRY_DSN) {
    initSentry(app);
    console.log('✅ Sentry error tracking initialized');
  }

  // Initialize Prometheus Metrics
  app.use(prometheus.prometheusMiddleware);
  app.get('/metrics', prometheus.metricsHandler);
  console.log('✅ Prometheus metrics initialized');

  // Initialize Analytics
  analytics.initialize();
  console.log('✅ Analytics services initialized');

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      services: {
        database: checkDatabaseHealth(),
        cache: checkCacheHealth(),
        storage: checkStorageHealth(),
        payments: checkPaymentHealth(),
      },
    };
    
    res.json(health);
  });

  // Readiness check endpoint
  app.get('/api/ready', async (req, res) => {
    try {
      const checks = await Promise.all([
        checkDatabaseConnection(),
        checkCacheConnection(),
        checkStorageConnection(),
        checkPaymentConnection(),
      ]);

      const allReady = checks.every(check => check.ready);
      
      res.status(allReady ? 200 : 503).json({
        ready: allReady,
        checks: checks,
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error.message,
      });
    }
  });

  // Liveness check endpoint
  app.get('/api/alive', (req, res) => {
    res.status(200).send('OK');
  });

  console.log('✨ All monitoring services initialized successfully!');
}

// Initialize browser monitoring
export function initializeBrowserMonitoring() {
  if (typeof window !== 'undefined') {
    // Initialize Datadog RUM
    if (process.env.VITE_DATADOG_CLIENT_TOKEN) {
      initDatadogRUM();
    }

    // Initialize Google Analytics and other browser analytics
    analytics.initialize();

    // Global error handler for browser
    window.addEventListener('error', (event) => {
      analytics.trackError(event.error, {
        source: 'window.onerror',
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      analytics.trackError(new Error(event.reason), {
        source: 'unhandledrejection',
        promise: true,
      });
    });

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          analytics.trackPerformance(entry.name, entry.value, {
            type: 'web-vital',
          });
        }
      });
      
      observer.observe({ entryTypes: ['web-vital'] });
    }
  }
}

// Health check functions
function checkDatabaseHealth() {
  // Implementation depends on your database setup
  return { status: 'healthy', latency: 5 };
}

function checkCacheHealth() {
  // Implementation depends on your cache setup
  return { status: 'healthy', latency: 1 };
}

function checkStorageHealth() {
  // Implementation depends on your storage setup
  return { status: 'healthy', available: true };
}

function checkPaymentHealth() {
  // Implementation depends on your payment setup
  return { status: 'healthy', provider: 'stripe' };
}

async function checkDatabaseConnection() {
  // Implement actual database check
  return { service: 'database', ready: true };
}

async function checkCacheConnection() {
  // Implement actual cache check
  return { service: 'cache', ready: true };
}

async function checkStorageConnection() {
  // Implement actual storage check
  return { service: 'storage', ready: true };
}

async function checkPaymentConnection() {
  // Implement actual payment check
  return { service: 'payments', ready: true };
}

export default {
  initializeMonitoring,
  initializeBrowserMonitoring,
};