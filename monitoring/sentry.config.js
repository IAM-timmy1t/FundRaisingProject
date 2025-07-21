// Sentry Error Tracking Configuration
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Initialize Sentry
export function initSentry(app) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Release tracking
    release: process.env.RELEASE_VERSION || 'unknown',
    // Set sampling rate
    profilesSampleRate: 1.0,
    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        // Filter out expected errors
        if (error?.message?.includes('AbortError')) {
          return null;
        }
      }
      return event;
    },
    // Custom breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out sensitive data from breadcrumbs
      if (breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });

  // Custom error contexts
  Sentry.configureScope((scope) => {
    scope.setTag('app_version', process.env.APP_VERSION || '1.0.0');
    scope.setContext('app', {
      name: 'Blessed-Horizon',
      environment: process.env.NODE_ENV,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  });
}

// Error boundary wrapper for React
export const ErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring utilities
export const startTransaction = (name, op = 'navigation') => {
  return Sentry.startTransaction({ name, op });
};

// Custom error capture with context
export const captureError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    Sentry.captureException(error);
  });
};

// User identification
export const identifyUser = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    // Don't send sensitive data
  });
};

// Clear user on logout
export const clearUser = () => {
  Sentry.setUser(null);
};

export default Sentry;