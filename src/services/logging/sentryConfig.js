import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Sentry configuration
export const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_BUILD_VERSION || '1.0.0',
  
  // Integrations
  integrations: [
    new BrowserTracing({
      // Set sampling rate for performance monitoring
      tracingOrigins: ['localhost', /^\//],
      // Capture interactions
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        window.React?.useEffect,
        window.useLocation,
        window.useNavigationType,
        window.createRoutesFromChildren,
        window.matchRoutes
      ),
    }),
    new Sentry.Replay({
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
  
  // Filtering
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Random plugins/extensions
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Facebook related errors
    'fb_xd_fragment',
    // Network errors
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
  ],
  
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Other browsers
    /^moz-extension:\/\//i,
    /^ms-browser-extension:\/\//i,
  ],
  
  // Hooks
  beforeSend(event, hint) {
    // Filter out certain errors
    const error = hint.originalException;
    
    // Don't send if local development
    if (window.location.hostname === 'localhost') {
      console.log('Sentry Event (dev):', event);
      return null;
    }
    
    // Add custom context
    if (event.contexts) {
      event.contexts.custom = {
        buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
        deploymentEnv: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
      };
    }
    
    // Sanitize sensitive data
    if (event.request?.cookies) {
      event.request.cookies = '[Filtered]';
    }
    
    if (event.user?.email) {
      // Hash email for privacy
      event.user.email = hashEmail(event.user.email);
    }
    
    return event;
  },
  
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter console breadcrumbs in production
    if (process.env.NODE_ENV === 'production' && breadcrumb.category === 'console') {
      return null;
    }
    
    // Add timestamp
    breadcrumb.timestamp = Date.now();
    
    // Sanitize data in breadcrumbs
    if (breadcrumb.data && breadcrumb.data.arguments) {
      breadcrumb.data.arguments = sanitizeData(breadcrumb.data.arguments);
    }
    
    return breadcrumb;
  },
};

// Initialize Sentry
export function initSentry(config = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  
  const finalConfig = {
    ...sentryConfig,
    ...config,
  };
  
  if (finalConfig.enabled && finalConfig.dsn) {
    Sentry.init(finalConfig);
    
    // Set initial user context
    const user = getCurrentUser();
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    }
    
    // Set initial tags
    Sentry.setTags({
      component: 'web-app',
      platform: 'blessed-horizon',
    });
    
    console.log('Sentry initialized successfully');
  }
}

// Utility functions
function hashEmail(email) {
  // Simple hash for privacy
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash)}`;
}

function sanitizeData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'credit_card'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[Filtered]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

function getCurrentUser() {
  // Get user from your auth system
  // This is a placeholder - implement based on your auth
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Profiler component
export const SentryProfiler = Sentry.Profiler;

// Manual error capture
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const captureEvent = Sentry.captureEvent;

// User feedback
export const showReportDialog = Sentry.showReportDialog;

// Performance monitoring
export const startTransaction = Sentry.startTransaction;

// Breadcrumbs
export const addBreadcrumb = Sentry.addBreadcrumb;

// Context
export const setContext = Sentry.setContext;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setTags = Sentry.setTags;
export const setExtra = Sentry.setExtra;
export const setExtras = Sentry.setExtras;

export default Sentry;