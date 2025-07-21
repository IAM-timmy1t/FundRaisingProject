import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import validator from 'validator';
import zxcvbn from 'zxcvbn';

// Initialize rate limiters
const loginRateLimiter = new RateLimiterMemory({
  keyPrefix: 'login_fail',
  points: 5, // Number of attempts
  duration: 900, // Per 15 minutes
  blockDuration: 1800, // Block for 30 minutes
});

const passwordResetRateLimiter = new RateLimiterMemory({
  keyPrefix: 'password_reset',
  points: 3,
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour
});

const accountCreationRateLimiter = new RateLimiterMemory({
  keyPrefix: 'account_create',
  points: 3,
  duration: 3600, // Per hour per IP
});

// Failed login attempts tracker
const failedLoginAttempts = new Map();

// Session manager
const activeSessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class AuthSecurityService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.setupSessionCleanup();
  }

  // Enhanced password validation
  validatePassword(password, userInfo = {}) {
    const minLength = 12;
    const errors = [];
    
    // Basic length check
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    // Check for common patterns
    const commonPatterns = [
      /^(.)\1+$/, // All same character
      /^(01|12|23|34|45|56|67|78|89|90|09|98|87|76|65|54|43|32|21|10)+$/, // Sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns');
    }

    // Use zxcvbn for advanced password strength checking
    const result = zxcvbn(password, [
      userInfo.email?.split('@')[0],
      userInfo.name,
      userInfo.username,
      'blessed-horizon',
      'donation',
      'campaign'
    ].filter(Boolean));

    if (result.score < 3) {
      errors.push('Password is too weak. ' + (result.feedback.warning || 'Try adding more unique characters'));
      if (result.feedback.suggestions.length > 0) {
        errors.push(...result.feedback.suggestions);
      }
    }

    // Check for required character types
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const typesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    if (typesCount < 3) {
      errors.push('Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: result.score,
      crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second
    };
  }

  // Rate limiting check
  async checkRateLimit(identifier, rateLimiter) {
    try {
      await rateLimiter.consume(identifier);
      return { allowed: true };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60,
        remainingAttempts: rateLimiterRes.remainingPoints || 0
      };
    }
  }

  // Login with enhanced security
  async secureLogin(email, password, ipAddress) {
    // Validate input
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Normalize email
    email = validator.normalizeEmail(email);

    // Check login rate limit
    const rateLimitKey = `${ipAddress}_${email}`;
    const rateLimitCheck = await this.checkRateLimit(rateLimitKey, loginRateLimiter);
    
    if (!rateLimitCheck.allowed) {
      // Log suspicious activity
      await this.logSecurityEvent('login_rate_limit_exceeded', {
        email,
        ipAddress,
        retryAfter: rateLimitCheck.retryAfter
      });

      throw new Error(`Too many login attempts. Please try again in ${rateLimitCheck.retryAfter} seconds.`);
    }

    // Check if account is locked
    const accountLockKey = `account_lock_${email}`;
    const isLocked = await this.isAccountLocked(email);
    
    if (isLocked) {
      throw new Error('Account is temporarily locked due to suspicious activity. Please reset your password or contact support.');
    }

    try {
      // Attempt login
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Track failed attempt
        await this.trackFailedLogin(email, ipAddress);
        throw error;
      }

      // Clear failed attempts on successful login
      failedLoginAttempts.delete(email);
      
      // Create session with timeout
      const sessionId = this.generateSessionId();
      const session = {
        userId: data.user.id,
        email: data.user.email,
        ipAddress,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + SESSION_TIMEOUT
      };
      
      activeSessions.set(sessionId, session);

      // Log successful login
      await this.logSecurityEvent('login_success', {
        userId: data.user.id,
        email: data.user.email,
        ipAddress,
        sessionId
      });

      return {
        ...data,
        sessionId,
        sessionTimeout: SESSION_TIMEOUT
      };
    } catch (error) {
      // Log failed login attempt
      await this.logSecurityEvent('login_failed', {
        email,
        ipAddress,
        error: error.message
      });

      throw error;
    }
  }

  // Track failed login attempts
  async trackFailedLogin(email, ipAddress) {
    const attempts = failedLoginAttempts.get(email) || { count: 0, firstAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    attempts.ipAddresses = attempts.ipAddresses || new Set();
    attempts.ipAddresses.add(ipAddress);

    failedLoginAttempts.set(email, attempts);

    // Lock account after 5 failed attempts
    if (attempts.count >= 5) {
      await this.lockAccount(email, 'Exceeded maximum login attempts');
      
      // Send security alert email
      await this.sendSecurityAlert(email, {
        type: 'account_locked',
        reason: 'Multiple failed login attempts',
        ipAddresses: Array.from(attempts.ipAddresses),
        unlockInstructions: true
      });
    }
  }

  // Account locking mechanism
  async lockAccount(email, reason) {
    const lockDuration = 30 * 60 * 1000; // 30 minutes
    const lockData = {
      email,
      reason,
      lockedAt: Date.now(),
      expiresAt: Date.now() + lockDuration
    };

    // Store in database
    const { error } = await this.supabase
      .from('account_locks')
      .insert(lockData);

    if (!error) {
      await this.logSecurityEvent('account_locked', lockData);
    }
  }

  // Check if account is locked
  async isAccountLocked(email) {
    const { data, error } = await this.supabase
      .from('account_locks')
      .select('*')
      .eq('email', email)
      .gt('expiresAt', Date.now())
      .single();

    return !error && data !== null;
  }

  // Session validation
  validateSession(sessionId) {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    const now = Date.now();
    
    // Check if session expired
    if (now > session.expiresAt) {
      activeSessions.delete(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    // Check for inactivity timeout
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      activeSessions.delete(sessionId);
      return { valid: false, reason: 'Session timeout due to inactivity' };
    }

    // Update last activity
    session.lastActivity = now;
    activeSessions.set(sessionId, session);

    return { valid: true, session };
  }

  // Generate secure session ID
  generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let sessionId = '';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < array.length; i++) {
      sessionId += chars[array[i] % chars.length];
    }
    
    return sessionId;
  }

  // Setup periodic session cleanup
  setupSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of activeSessions.entries()) {
        if (now > session.expiresAt || now - session.lastActivity > SESSION_TIMEOUT) {
          activeSessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Detect suspicious activity
  async detectSuspiciousActivity(userId, activity) {
    const suspiciousPatterns = {
      rapidLocationChange: async (data) => {
        // Check if user logged in from different geographic location within short time
        const recentLogins = await this.getRecentLogins(userId, 1); // Last hour
        if (recentLogins.length > 1) {
          const locations = recentLogins.map(l => l.location);
          // Calculate distance between locations
          const distance = this.calculateDistance(locations[0], locations[1]);
          // If distance > 1000km in < 1 hour, flag as suspicious
          return distance > 1000;
        }
        return false;
      },
      
      unusualAccessTime: (data) => {
        // Check if login occurs at unusual time for user
        const hour = new Date().getHours();
        const userTimezone = data.timezone || 'UTC';
        // Flag logins between 2 AM - 5 AM user's local time
        return hour >= 2 && hour <= 5;
      },
      
      multipleFailedAttempts: (data) => {
        const attempts = failedLoginAttempts.get(data.email);
        return attempts && attempts.count >= 3;
      },
      
      unknownDevice: async (data) => {
        // Check if device fingerprint is new
        const knownDevices = await this.getKnownDevices(userId);
        return !knownDevices.includes(data.deviceFingerprint);
      }
    };

    const flags = [];
    for (const [pattern, check] of Object.entries(suspiciousPatterns)) {
      if (await check(activity)) {
        flags.push(pattern);
      }
    }

    if (flags.length > 0) {
      await this.logSecurityEvent('suspicious_activity_detected', {
        userId,
        activity,
        flags
      });

      // Take action based on severity
      if (flags.length >= 2) {
        // Multiple red flags - require additional verification
        await this.requireAdditionalVerification(userId);
      }
    }

    return flags;
  }

  // Log security events
  async logSecurityEvent(eventType, data) {
    try {
      await this.supabase
        .from('security_logs')
        .insert({
          event_type: eventType,
          data,
          timestamp: new Date().toISOString(),
          user_id: data.userId || null,
          ip_address: data.ipAddress || null
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Send security alert
  async sendSecurityAlert(email, alertData) {
    // Integration with email service to send security alerts
    console.log('Security alert:', email, alertData);
    // TODO: Implement actual email sending
  }

  // Additional helper methods
  async getRecentLogins(userId, hours) {
    const { data } = await this.supabase
      .from('security_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'login_success')
      .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });
    
    return data || [];
  }

  async getKnownDevices(userId) {
    const { data } = await this.supabase
      .from('user_devices')
      .select('device_fingerprint')
      .eq('user_id', userId);
    
    return (data || []).map(d => d.device_fingerprint);
  }

  calculateDistance(loc1, loc2) {
    // Simplified distance calculation
    // In production, use proper geolocation calculation
    return Math.sqrt(
      Math.pow(loc1.lat - loc2.lat, 2) + 
      Math.pow(loc1.lng - loc2.lng, 2)
    ) * 111; // Rough conversion to km
  }

  async requireAdditionalVerification(userId) {
    // Mark user as requiring additional verification
    await this.supabase
      .from('user_profiles')
      .update({ requires_verification: true })
      .eq('id', userId);
  }
}

export default AuthSecurityService;