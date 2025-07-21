# ⚡ Blessed-Horizon Performance Tuning Guide

## Overview
This guide provides performance optimization configurations for Blessed-Horizon to ensure fast response times and efficient resource utilization.

## 🚀 Frontend Performance

### 1. Vite Build Optimization

Update `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // PWA optimization
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.blessed-horizon\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'utils-vendor': ['date-fns', 'clsx', 'axios'],
          'stripe': ['@stripe/stripe-js'],
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    // Source maps for production (uploaded to Sentry)
    sourcemap: 'hidden',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
```

### 2. React Performance Optimizations

```javascript
// src/utils/performance.js
import { lazy, Suspense } from 'react';

// Lazy load heavy components
export const LazyDashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ '../components/Dashboard')
);

export const LazyAnalytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ '../components/Analytics')
);

// Image optimization hook
export const useOptimizedImage = (src, options = {}) => {
  const { width = 800, quality = 80, format = 'webp' } = options;
  
  // Use Supabase image transformation
  if (src?.includes('supabase')) {
    return `${src}?width=${width}&quality=${quality}&format=${format}`;
  }
  
  return src;
};

// Debounce hook for search inputs
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

### 3. Component Optimization Patterns

```javascript
// Memoize expensive components
export const CampaignCard = memo(({ campaign }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.campaign.id === nextProps.campaign.id &&
         prevProps.campaign.current_amount === nextProps.campaign.current_amount;
});

// Virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

export const CampaignList = ({ campaigns }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <CampaignCard campaign={campaigns[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={campaigns.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

## 🗄️ Database Performance

### 1. PostgreSQL Optimization

```sql
-- Create optimized indexes
CREATE INDEX CONCURRENTLY idx_campaigns_status_created ON campaigns(status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_donations_campaign_created ON donations(campaign_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_campaign_updates_campaign ON campaign_updates(campaign_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_email_lower ON users(LOWER(email));

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_campaigns_active ON campaigns(created_at DESC) 
WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_donations_recent ON donations(created_at DESC) 
WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days';

-- Enable query parallelization
ALTER TABLE campaigns SET (parallel_workers = 4);
ALTER TABLE donations SET (parallel_workers = 4);

-- Update table statistics
ANALYZE campaigns;
ANALYZE donations;
ANALYZE users;
ANALYZE campaign_updates;

-- Configure autovacuum for high-traffic tables
ALTER TABLE donations SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
```

### 2. Query Optimization

```javascript
// src/services/optimizedQueries.js

// Use materialized views for expensive aggregations
export const createMaterializedViews = async () => {
  await supabase.rpc('create_campaign_stats_view', {
    sql: `
      CREATE MATERIALIZED VIEW campaign_stats AS
      SELECT 
        c.id,
        c.title,
        COUNT(DISTINCT d.user_id) as donor_count,
        COALESCE(SUM(d.amount), 0) as total_raised,
        COALESCE(AVG(d.amount), 0) as avg_donation,
        MAX(d.created_at) as last_donation_at
      FROM campaigns c
      LEFT JOIN donations d ON c.id = d.campaign_id AND d.status = 'completed'
      GROUP BY c.id, c.title
      WITH DATA;
      
      CREATE INDEX idx_campaign_stats_total ON campaign_stats(total_raised DESC);
    `
  });
};

// Optimized campaign query with pagination
export const getOptimizedCampaigns = async (page = 1, limit = 20) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      description,
      goal_amount,
      current_amount,
      end_date,
      category,
      images->>0 as main_image,
      recipient:users!recipient_id(
        id,
        full_name,
        avatar_url,
        trust_score
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  return { data, error };
};
```

## ⚡ API Performance

### 1. Response Caching

```javascript
// api/middleware/cache.js
import Redis from 'ioredis';
import { createHash } from 'crypto';

const redis = new Redis(process.env.REDIS_URL);

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Generate cache key
    const key = `cache:${createHash('md5').update(req.originalUrl).digest('hex')}`;

    try {
      // Check cache
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        redis.setex(key, duration, JSON.stringify(data));
        
        // Send response
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};
```

### 2. Database Connection Pooling

```javascript
// src/lib/db.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Connection pool monitoring
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Query with automatic retries
export const query = async (text, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn('Slow query detected:', { text, duration });
      }
      
      return result;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
};
```

## 🌐 CDN and Static Asset Optimization

### 1. Cloudflare Configuration

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Cache static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2)$/)) {
    const cache = caches.default;
    let response = await cache.match(request);
    
    if (!response) {
      response = await fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      event.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
  }
  
  // Add security headers
  const response = await fetch(request);
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-XSS-Protection', '1; mode=block');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
```

## 📊 Monitoring and Metrics

### 1. Performance Monitoring Setup

```javascript
// src/utils/performance-monitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.initializeObservers();
  }

  initializeObservers() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      this.reportMetric('LCP', this.metrics.lcp);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fid = entry.processingStart - entry.startTime;
        this.reportMetric('FID', this.metrics.fid);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    let clsEntries = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += entry.value;
          this.metrics.cls = clsValue;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  reportMetric(name, value) {
    // Send to analytics
    if (window.gtag) {
      gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(name === 'CLS' ? value * 1000 : value)
      });
    }

    // Send to monitoring service
    if (window.newrelic) {
      newrelic.addPageAction('web_vitals', {
        metric: name,
        value: value
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }
}

export default new PerformanceMonitor();
```

## 🎯 Performance Targets

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### API Response Time Targets
- **Authentication endpoints**: < 200ms
- **Campaign list endpoint**: < 300ms
- **Donation processing**: < 500ms
- **Search endpoints**: < 400ms

### Database Query Targets
- **Simple queries**: < 50ms
- **Complex aggregations**: < 200ms
- **Full-text search**: < 300ms

### Resource Size Targets
- **Total JS bundle**: < 200KB (gzipped)
- **Total CSS**: < 50KB (gzipped)
- **Largest image**: < 200KB
- **Total page weight**: < 1MB

## 🔧 Performance Testing Commands

```bash
# Run Lighthouse CI
npm run lighthouse:ci

# Run bundle analysis
npm run build -- --analyze

# Load testing
npm run test:load -- --users=1000 --duration=300

# Database query analysis
npm run db:analyze

# Memory profiling
npm run profile:memory
```

## 📈 Continuous Performance Monitoring

1. Set up performance budgets in CI/CD
2. Monitor Core Web Vitals in production
3. Set up alerts for performance regressions
4. Regular performance audits (weekly)
5. A/B test performance improvements
