import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Log levels
const LogLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Log categories
const LogCategories = {
  AUTH: 'authentication',
  PAYMENT: 'payment',
  CAMPAIGN: 'campaign',
  DONATION: 'donation',
  USER: 'user',
  SYSTEM: 'system',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  API: 'api',
  DATABASE: 'database'
};

class LoggingService {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.logBuffer = [];
    this.bufferSize = 50;
    this.flushInterval = 30000; // 30 seconds
    this.initializeSentry();
    this.startBufferFlush();
  }

  // Initialize Sentry for error tracking
  initializeSentry() {
    if (process.env.REACT_APP_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.REACT_APP_SENTRY_DSN,
        integrations: [
          new Integrations.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: false,
            blockAllMedia: false,
          })
        ],
        environment: this.environment,
        tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend: (event, hint) => {
          // Filter out sensitive data
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          if (event.user?.email) {
            event.user.email = this.hashEmail(event.user.email);
          }
          return event;
        }
      });
    }
  }

  // Core logging method
  async log(level, message, data = {}, category = LogCategories.SYSTEM) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      environment: this.environment,
      user_id: data.userId || null,
      session_id: data.sessionId || this.getSessionId(),
      request_id: data.requestId || this.generateRequestId(),
      client_info: this.getClientInfo()
    };

    // Console log in development
    if (this.environment === 'development') {
      this.consoleLog(level, message, data);
    }

    // Send to Sentry for errors
    if (level === LogLevels.ERROR || level === LogLevels.CRITICAL) {
      this.sendToSentry(level, message, data, category);
    }

    // Add to buffer for batch processing
    this.addToBuffer(logEntry);

    // Immediate flush for critical logs
    if (level === LogLevels.CRITICAL) {
      await this.flushBuffer();
    }
  }

  // Convenience methods
  debug(message, data = {}, category = LogCategories.SYSTEM) {
    return this.log(LogLevels.DEBUG, message, data, category);
  }

  info(message, data = {}, category = LogCategories.SYSTEM) {
    return this.log(LogLevels.INFO, message, data, category);
  }

  warn(message, data = {}, category = LogCategories.SYSTEM) {
    return this.log(LogLevels.WARN, message, data, category);
  }

  error(message, data = {}, category = LogCategories.SYSTEM) {
    return this.log(LogLevels.ERROR, message, data, category);
  }

  critical(message, data = {}, category = LogCategories.SYSTEM) {
    return this.log(LogLevels.CRITICAL, message, data, category);
  }

  // Log API requests
  logApiRequest(method, endpoint, data = {}) {
    return this.info(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      ...data
    }, LogCategories.API);
  }

  // Log API responses
  logApiResponse(method, endpoint, status, duration, data = {}) {
    const level = status >= 400 ? LogLevels.ERROR : LogLevels.INFO;
    return this.log(level, `API Response: ${method} ${endpoint} - ${status}`, {
      method,
      endpoint,
      status,
      duration,
      ...data
    }, LogCategories.API);
  }

  // Log user actions
  logUserAction(action, data = {}) {
    return this.info(`User Action: ${action}`, data, LogCategories.USER);
  }

  // Log security events
  logSecurityEvent(event, data = {}) {
    return this.warn(`Security Event: ${event}`, data, LogCategories.SECURITY);
  }

  // Log performance metrics
  logPerformance(metric, value, data = {}) {
    return this.info(`Performance: ${metric}`, {
      metric,
      value,
      ...data
    }, LogCategories.PERFORMANCE);
  }

  // Buffer management
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  async flushBuffer() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await supabase
        .from('application_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush logs to database:', error);
        // Re-add logs to buffer if flush failed
        this.logBuffer = [...logsToFlush, ...this.logBuffer].slice(-this.bufferSize * 2);
      }
    } catch (error) {
      console.error('Error flushing log buffer:', error);
    }
  }

  startBufferFlush() {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  // Send to Sentry
  sendToSentry(level, message, data, category) {
    const sentryLevel = level === LogLevels.CRITICAL ? 'fatal' : level;
    
    Sentry.captureMessage(message, {
      level: sentryLevel,
      tags: {
        category,
        environment: this.environment
      },
      extra: this.sanitizeData(data)
    });
  }

  // Console logging for development
  consoleLog(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case LogLevels.DEBUG:
        console.debug(prefix, message, data);
        break;
      case LogLevels.INFO:
        console.info(prefix, message, data);
        break;
      case LogLevels.WARN:
        console.warn(prefix, message, data);
        break;
      case LogLevels.ERROR:
      case LogLevels.CRITICAL:
        console.error(prefix, message, data);
        break;
      default:
        console.log(prefix, message, data);
    }
  }

  // Data sanitization
  sanitizeData(data) {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];
    const sanitized = { ...data };

    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  // Utility methods
  getSessionId() {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('log_session_id');
      if (!sessionId) {
        sessionId = this.generateSessionId();
        sessionStorage.setItem('log_session_id', sessionId);
      }
      return sessionId;
    }
    return null;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientInfo() {
    if (typeof window !== 'undefined') {
      return {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };
    }
    return {};
  }

  hashEmail(email) {
    // Simple hash for privacy
    return email.split('@')[0].substring(0, 3) + '***@' + email.split('@')[1];
  }

  // Error tracking methods
  captureException(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    };

    this.error(`Exception: ${error.message}`, errorData);
    
    if (this.environment === 'production') {
      Sentry.captureException(error, {
        contexts: {
          custom: context
        }
      });
    }
  }

  // User identification for Sentry
  identifyUser(user) {
    if (user && process.env.REACT_APP_SENTRY_DSN) {
      Sentry.setUser({
        id: user.id,
        email: this.hashEmail(user.email),
        username: user.username
      });
    }
  }

  // Clear user identification
  clearUser() {
    Sentry.setUser(null);
  }

  // Performance monitoring
  startTransaction(name, op = 'navigation') {
    return Sentry.startTransaction({ name, op });
  }

  // Breadcrumb tracking
  addBreadcrumb(message, category = 'custom', data = {}) {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000
    });
  }
}

export const loggingService = new LoggingService();
export { LogLevels, LogCategories };
