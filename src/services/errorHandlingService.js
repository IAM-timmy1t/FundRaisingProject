import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import logger from './logging/logger';
import { supabase } from '@/lib/supabase';

class ErrorHandlingService {
  constructor() {
    this.isInitialized = false;
    this.errorQueue = [];
    this.errorHandlers = new Map();
    this.userFeedbackEnabled = true;
    
    // Default error categories
    this.errorCategories = {
      AUTH: 'Authentication Error',
      PAYMENT: 'Payment Processing Error',
      NETWORK: 'Network Connection Error',
      VALIDATION: 'Data Validation Error',
      PERMISSION: 'Permission Denied',
      SERVER: 'Server Error',
      CLIENT: 'Client Error',
      UNKNOWN: 'Unknown Error'
    };
  }

  // Initialize error handling with Sentry
  initialize(config = {}) {
    try {
      if (this.isInitialized) {
        logger.warn('Error handling service already initialized');
        return;
      }

      // Initialize Sentry
      Sentry.init({
        dsn: config.sentryDsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        integrations: [
          new BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              React.useEffect,
              useLocation,
              useNavigationType,
              createRoutesFromChildren,
              matchRoutes
            ),
            tracingOrigins: ['localhost', /^\//],
          }),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend: (event, hint) => this.beforeSendHook(event, hint),
        beforeBreadcrumb: (breadcrumb) => this.beforeBreadcrumbHook(breadcrumb),
      });

      // Set up global error handlers
      this.setupGlobalHandlers();
      
      // Process any queued errors
      this.processErrorQueue();
      
      this.isInitialized = true;
      logger.info('Error handling service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize error handling:', error);
    }
  }

  // Set up global error handlers
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        category: 'PROMISE_REJECTION',
        context: { promise: event.promise }
      });
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message, {
        category: 'GLOBAL_ERROR',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Handle React Error Boundary errors
    if (typeof window !== 'undefined' && window.React) {
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0] && args[0].includes && args[0].includes('React')) {
          this.handleError(new Error(args[0]), {
            category: 'REACT_ERROR',
            context: { args }
          });
        }
        originalError.apply(console, args);
      };
    }
  }

  // Main error handling method
  async handleError(error, options = {}) {
    try {
      // Normalize error object
      const normalizedError = this.normalizeError(error);
      
      // Enrich error with context
      const enrichedError = await this.enrichError(normalizedError, options);
      
      // Log error
      logger.error(enrichedError.message, enrichedError);
      
      // Send to Sentry if initialized
      if (this.isInitialized) {
        Sentry.captureException(normalizedError, {
          contexts: enrichedError.context,
          tags: enrichedError.tags,
          level: enrichedError.severity
        });
      } else {
        // Queue error if not initialized
        this.errorQueue.push({ error: normalizedError, options });
      }
      
      // Store error in database for admin dashboard
      await this.storeErrorInDatabase(enrichedError);
      
      // Execute custom error handlers
      this.executeCustomHandlers(enrichedError);
      
      // Show user-friendly message if enabled
      if (this.userFeedbackEnabled && options.showUserMessage !== false) {
        this.showUserMessage(enrichedError);
      }
      
      return enrichedError;
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
    }
  }

  // Normalize various error types
  normalizeError(error) {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error && typeof error === 'object') {
      const message = error.message || error.error || JSON.stringify(error);
      const normalizedError = new Error(message);
      Object.assign(normalizedError, error);
      return normalizedError;
    }
    
    return new Error('Unknown error');
  }

  // Enrich error with additional context
  async enrichError(error, options) {
    const enrichedError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      category: options.category || this.categorizeError(error),
      severity: options.severity || this.determineSeverity(error),
      context: {
        ...options.context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      tags: {
        category: options.category || 'UNKNOWN',
        environment: process.env.NODE_ENV,
        ...options.tags
      },
      user: await this.getUserContext(),
      breadcrumbs: this.getBreadcrumbs()
    };
    
    return enrichedError;
  }

  // Categorize error based on type and content
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'AUTH';
    }
    if (message.includes('payment') || message.includes('stripe')) {
      return 'PAYMENT';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'PERMISSION';
    }
    if (error.statusCode >= 500) {
      return 'SERVER';
    }
    if (error.statusCode >= 400) {
      return 'CLIENT';
    }
    
    return 'UNKNOWN';
  }

  // Determine error severity
  determineSeverity(error) {
    if (error.statusCode >= 500 || error.category === 'SERVER') {
      return 'error';
    }
    if (error.category === 'AUTH' || error.category === 'PAYMENT') {
      return 'warning';
    }
    if (error.category === 'VALIDATION') {
      return 'info';
    }
    
    return 'error';
  }

  // Get user context for error
  async getUserContext() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role
        };
      }
    } catch (error) {
      logger.warn('Failed to get user context:', error);
    }
    return null;
  }

  // Store error in database
  async storeErrorInDatabase(error) {
    try {
      const { error: dbError } = await supabase
        .from('error_logs')
        .insert({
          error_id: error.id,
          message: error.message,
          stack: error.stack,
          category: error.category,
          severity: error.severity,
          context: error.context,
          tags: error.tags,
          user_id: error.user?.id,
          timestamp: error.timestamp,
          resolved: false
        });
        
      if (dbError) {
        logger.error('Failed to store error in database:', dbError);
      }
    } catch (error) {
      logger.error('Error storing error in database:', error);
    }
  }

  // Show user-friendly error message
  showUserMessage(error) {
    const userMessage = this.getUserFriendlyMessage(error);
    
    // Emit event for UI components to handle
    window.dispatchEvent(new CustomEvent('app:error', {
      detail: {
        message: userMessage,
        severity: error.severity,
        category: error.category,
        id: error.id
      }
    }));
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error) {
    const messages = {
      AUTH: 'Authentication failed. Please try logging in again.',
      PAYMENT: 'Payment processing failed. Please check your payment details and try again.',
      NETWORK: 'Network connection error. Please check your internet connection.',
      VALIDATION: 'Please check your input and try again.',
      PERMISSION: 'You don\'t have permission to perform this action.',
      SERVER: 'We\'re experiencing technical difficulties. Please try again later.',
      CLIENT: 'Something went wrong. Please refresh the page and try again.',
      UNKNOWN: 'An unexpected error occurred. Please try again.'
    };
    
    return messages[error.category] || messages.UNKNOWN;
  }

  // Register custom error handler
  registerErrorHandler(category, handler) {
    if (!this.errorHandlers.has(category)) {
      this.errorHandlers.set(category, []);
    }
    this.errorHandlers.get(category).push(handler);
  }

  // Execute custom error handlers
  executeCustomHandlers(error) {
    const handlers = this.errorHandlers.get(error.category) || [];
    handlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        logger.error('Error in custom handler:', handlerError);
      }
    });
  }

  // Process queued errors
  processErrorQueue() {
    while (this.errorQueue.length > 0) {
      const { error, options } = this.errorQueue.shift();
      this.handleError(error, options);
    }
  }

  // Get breadcrumbs for error context
  getBreadcrumbs() {
    // This would integrate with your app's navigation/action tracking
    return [];
  }

  // Sentry hooks
  beforeSendHook(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Don't send certain errors to Sentry
      if (error?.message?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }
      
      // Add additional context
      event.extra = {
        ...event.extra,
        sessionId: this.getSessionId(),
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION
      };
    }
    
    return event;
  }

  beforeBreadcrumbHook(breadcrumb) {
    // Filter out certain breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }
    
    return breadcrumb;
  }

  // Utility methods
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  // Error recovery methods
  async attemptRecovery(error) {
    const recoveryStrategies = {
      AUTH: async () => {
        // Try to refresh auth token
        const { error } = await supabase.auth.refreshSession();
        return !error;
      },
      NETWORK: async () => {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return navigator.onLine;
      },
      PAYMENT: async () => {
        // Clear payment cache and retry
        sessionStorage.removeItem('stripe_payment_intent');
        return true;
      }
    };
    
    const strategy = recoveryStrategies[error.category];
    if (strategy) {
      try {
        return await strategy();
      } catch (recoveryError) {
        logger.error('Recovery attempt failed:', recoveryError);
        return false;
      }
    }
    
    return false;
  }
}

export default new ErrorHandlingService();