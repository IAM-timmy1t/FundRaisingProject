import { supabase } from '@/lib/supabase';

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const LogLevelNames = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'FATAL'
};

class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    this.logToConsole = true;
    this.logToDatabase = process.env.NODE_ENV === 'production';
    this.logToSentry = true;
    this.logBuffer = [];
    this.maxBufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.metadata = {};
    
    // Start buffer flush interval
    this.startFlushInterval();
    
    // Set up performance monitoring
    this.performanceMarks = new Map();
  }

  // Set global metadata
  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  // Clear metadata
  clearMetadata() {
    this.metadata = {};
  }

  // Main logging method
  async log(level, message, data = {}) {
    if (level < this.logLevel) {
      return;
    }

    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: LogLevelNames[level],
      message,
      data: {
        ...this.metadata,
        ...data
      },
      context: this.getContext(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_BUILD_VERSION
    };

    // Console logging
    if (this.logToConsole) {
      this.logToConsoleFormatted(logEntry);
    }

    // Buffer for database logging
    if (this.logToDatabase) {
      this.logBuffer.push(logEntry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.maxBufferSize) {
        await this.flushLogs();
      }
    }

    // Send errors to Sentry
    if (this.logToSentry && level >= LogLevel.ERROR && window.Sentry) {
      this.sendToSentry(logEntry);
    }

    // Emit log event for real-time monitoring
    this.emitLogEvent(logEntry);
  }

  // Convenience methods
  debug(message, data) {
    return this.log(LogLevel.DEBUG, message, data);
  }

  info(message, data) {
    return this.log(LogLevel.INFO, message, data);
  }

  warn(message, data) {
    return this.log(LogLevel.WARN, message, data);
  }

  error(message, data) {
    return this.log(LogLevel.ERROR, message, data);
  }

  fatal(message, data) {
    return this.log(LogLevel.FATAL, message, data);
  }

  // Performance logging
  startTimer(label) {
    this.performanceMarks.set(label, performance.now());
  }

  endTimer(label, metadata = {}) {
    const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performanceMarks.delete(label);
      
      this.info(`Performance: ${label}`, {
        duration: `${duration.toFixed(2)}ms`,
        ...metadata
      });
      
      return duration;
    }
  }

  // Log to console with formatting
  logToConsoleFormatted(logEntry) {
    const { level, message, data, timestamp } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString();
    
    const styles = {
      DEBUG: 'color: #888; font-weight: normal;',
      INFO: 'color: #2196F3; font-weight: normal;',
      WARN: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;',
      FATAL: 'color: #F44336; font-weight: bold; text-decoration: underline;'
    };

    const prefix = `%c[${time}] [${level}]`;
    const style = styles[level] || '';

    if (Object.keys(data).length > 0) {
      console.groupCollapsed(prefix + ' ' + message, style);
      console.log('Data:', data);
      console.log('Context:', logEntry.context);
      console.groupEnd();
    } else {
      console.log(prefix + ' ' + message, style);
    }
  }

  // Get current context
  getContext() {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      } : null
    };
  }

  // Flush logs to database
  async flushLogs() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await supabase
        .from('application_logs')
        .insert(logsToFlush.map(log => ({
          log_id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          data: log.data,
          context: log.context,
          environment: log.environment,
          version: log.version
        })));

      if (error) {
        console.error('Failed to flush logs to database:', error);
        // Re-add logs to buffer if flush failed
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Re-add logs to buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  // Start flush interval
  startFlushInterval() {
    setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushLogs();
      }
    }, this.flushInterval);
  }

  // Send to Sentry
  sendToSentry(logEntry) {
    if (window.Sentry) {
      const { level, message, data } = logEntry;
      
      if (level === 'ERROR' || level === 'FATAL') {
        window.Sentry.captureMessage(message, {
          level: level.toLowerCase(),
          extra: data,
          tags: {
            logger: 'application'
          }
        });
      }
    }
  }

  // Emit log event
  emitLogEvent(logEntry) {
    window.dispatchEvent(new CustomEvent('app:log', {
      detail: logEntry
    }));
  }

  // Generate unique log ID
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Structured logging methods
  logUserAction(action, data = {}) {
    return this.info(`User Action: ${action}`, {
      category: 'user_action',
      action,
      ...data
    });
  }

  logApiCall(method, endpoint, data = {}) {
    return this.info(`API Call: ${method} ${endpoint}`, {
      category: 'api_call',
      method,
      endpoint,
      ...data
    });
  }

  logSecurityEvent(event, data = {}) {
    return this.warn(`Security Event: ${event}`, {
      category: 'security',
      event,
      ...data
    });
  }

  logPaymentEvent(event, data = {}) {
    return this.info(`Payment Event: ${event}`, {
      category: 'payment',
      event,
      ...data
    });
  }

  logPerformanceMetric(metric, value, data = {}) {
    return this.info(`Performance Metric: ${metric}`, {
      category: 'performance',
      metric,
      value,
      ...data
    });
  }

  // Batch logging for multiple related entries
  batch() {
    const entries = [];
    const batchId = this.generateLogId();
    
    const batchLogger = {
      debug: (message, data) => {
        entries.push({ level: LogLevel.DEBUG, message, data });
        return batchLogger;
      },
      info: (message, data) => {
        entries.push({ level: LogLevel.INFO, message, data });
        return batchLogger;
      },
      warn: (message, data) => {
        entries.push({ level: LogLevel.WARN, message, data });
        return batchLogger;
      },
      error: (message, data) => {
        entries.push({ level: LogLevel.ERROR, message, data });
        return batchLogger;
      },
      commit: async () => {
        for (const entry of entries) {
          await this.log(entry.level, entry.message, {
            ...entry.data,
            batchId
          });
        }
      }
    };
    
    return batchLogger;
  }

  // Create child logger with additional context
  child(metadata) {
    const childLogger = Object.create(this);
    childLogger.metadata = { ...this.metadata, ...metadata };
    return childLogger;
  }
}

// Export singleton instance
export default new Logger();