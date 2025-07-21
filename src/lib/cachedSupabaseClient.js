import { createClient } from '@supabase/supabase-js';

// Cache configuration
const CACHE_CONFIG = {
  // Cache durations in milliseconds
  DURATIONS: {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 15 * 60 * 1000,    // 15 minutes
    LONG: 60 * 60 * 1000,      // 1 hour
    VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
  },
  
  // Cache keys
  KEYS: {
    CAMPAIGNS: 'campaigns',
    CAMPAIGN_DETAIL: 'campaign_',
    USER_PROFILE: 'user_profile_',
    DONATIONS: 'donations_',
    TRUST_SCORE: 'trust_score_',
    NOTIFICATIONS: 'notifications_',
    ANALYTICS: 'analytics_',
  }
};

// In-memory cache with TTL
class QueryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, data, duration = CACHE_CONFIG.DURATIONS.SHORT) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set new cache entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, duration);
    
    this.timers.set(key, timer);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if still valid
    const elapsed = Date.now() - entry.timestamp;
    if (elapsed > entry.duration) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  invalidate(pattern) {
    // Invalidate all keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
      }
    }
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memory: JSON.stringify(Array.from(this.cache.values())).length
    };
  }
}

// Create cache instance
const queryCache = new QueryCache();

// Enhanced Supabase client with caching
export const createCachedSupabaseClient = (supabaseUrl, supabaseAnonKey) => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Wrap common query methods with caching
  const cached = {
    ...supabase,
    
    // Cached campaign queries
    campaigns: {
      list: async (options = {}) => {
        const cacheKey = `${CACHE_CONFIG.KEYS.CAMPAIGNS}_${JSON.stringify(options)}`;
        const cached = queryCache.get(cacheKey);
        
        if (cached) {
          console.log('[Cache Hit]', cacheKey);
          return cached;
        }
        
        console.log('[Cache Miss]', cacheKey);
        const result = await supabase
          .from('campaigns')
          .select('*', options);
          
        if (result.data) {
          queryCache.set(cacheKey, result, CACHE_CONFIG.DURATIONS.SHORT);
        }
        
        return result;
      },
      
      get: async (id) => {
        const cacheKey = `${CACHE_CONFIG.KEYS.CAMPAIGN_DETAIL}${id}`;
        const cached = queryCache.get(cacheKey);
        
        if (cached) {
          console.log('[Cache Hit]', cacheKey);
          return cached;
        }
        
        console.log('[Cache Miss]', cacheKey);
        const result = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .single();
          
        if (result.data) {
          queryCache.set(cacheKey, result, CACHE_CONFIG.DURATIONS.MEDIUM);
        }
        
        return result;
      },
      
      // Invalidate campaign cache
      invalidate: (id) => {
        if (id) {
          queryCache.delete(`${CACHE_CONFIG.KEYS.CAMPAIGN_DETAIL}${id}`);
        }
        queryCache.invalidate(CACHE_CONFIG.KEYS.CAMPAIGNS);
      }
    },
    
    // Cached user profile queries
    profiles: {
      get: async (userId) => {
        const cacheKey = `${CACHE_CONFIG.KEYS.USER_PROFILE}${userId}`;
        const cached = queryCache.get(cacheKey);
        
        if (cached) {
          console.log('[Cache Hit]', cacheKey);
          return cached;
        }
        
        console.log('[Cache Miss]', cacheKey);
        const result = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (result.data) {
          queryCache.set(cacheKey, result, CACHE_CONFIG.DURATIONS.LONG);
        }
        
        return result;
      },
      
      invalidate: (userId) => {
        queryCache.delete(`${CACHE_CONFIG.KEYS.USER_PROFILE}${userId}`);
      }
    },
    
    // Cached analytics queries
    analytics: {
      getCampaignStats: async (campaignId, options = {}) => {
        const cacheKey = `${CACHE_CONFIG.KEYS.ANALYTICS}campaign_${campaignId}_${JSON.stringify(options)}`;
        const cached = queryCache.get(cacheKey);
        
        if (cached) {
          console.log('[Cache Hit]', cacheKey);
          return cached;
        }
        
        console.log('[Cache Miss]', cacheKey);
        // Perform analytics query
        const result = await supabase
          .from('donations')
          .select('amount')
          .eq('campaign_id', campaignId);
          
        if (result.data) {
          // Calculate stats
          const stats = {
            total: result.data.reduce((sum, d) => sum + d.amount, 0),
            count: result.data.length,
            average: result.data.length > 0 ? result.data.reduce((sum, d) => sum + d.amount, 0) / result.data.length : 0
          };
          
          queryCache.set(cacheKey, { data: stats, error: null }, CACHE_CONFIG.DURATIONS.MEDIUM);
          return { data: stats, error: null };
        }
        
        return result;
      },
      
      invalidate: (campaignId) => {
        queryCache.invalidate(`${CACHE_CONFIG.KEYS.ANALYTICS}campaign_${campaignId}`);
      }
    },
    
    // Cache management
    cache: {
      clear: () => queryCache.clear(),
      stats: () => queryCache.getStats(),
      invalidate: (pattern) => queryCache.invalidate(pattern)
    }
  };
  
  return cached;
};

// Export cache config and utilities
export { CACHE_CONFIG, queryCache };