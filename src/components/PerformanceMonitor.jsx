import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Performance thresholds based on Google's recommendations
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
};

// Get performance rating based on value and thresholds
const getMetricRating = (metricName, value) => {
  const threshold = THRESHOLDS[metricName];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value >= threshold.poor) return 'poor';
  return 'needs-improvement';
};

// Send analytics to your analytics service
const sendToAnalytics = ({ name, delta, value, id, rating }) => {
  // Send to your analytics service (Google Analytics, Mixpanel, etc.)
  if (window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      metric_rating: rating,
      non_interaction: true,
    });
  }

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: value.toFixed(2),
      rating,
      delta: delta.toFixed(2),
      id
    });
  }
};

// Custom hook for performance monitoring
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Only run in production or if explicitly enabled
    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      const handleMetric = (metric) => {
        const rating = getMetricRating(metric.name, metric.value);
        sendToAnalytics({ ...metric, rating });
      };

      // Measure all Web Vitals
      getCLS(handleMetric);
      getFID(handleMetric);
      getFCP(handleMetric);
      getLCP(handleMetric);
      getTTFB(handleMetric);

      // Additional custom performance metrics
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        
        // Page Load Time
        window.addEventListener('load', () => {
          const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
          sendToAnalytics({
            name: 'Page Load Time',
            value: pageLoadTime,
            id: 'page-load',
            delta: 0,
            rating: pageLoadTime < 3000 ? 'good' : pageLoadTime < 5000 ? 'needs-improvement' : 'poor'
          });
        });

        // Time to Interactive (approximation)
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                const tti = entry.startTime + entry.duration;
                sendToAnalytics({
                  name: 'Time to Interactive',
                  value: tti,
                  id: 'tti',
                  delta: 0,
                  rating: tti < 3800 ? 'good' : tti < 7300 ? 'needs-improvement' : 'poor'
                });
              }
            }
          });
          observer.observe({ entryTypes: ['paint'] });
        }
      }

      // Monitor long tasks
      if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            sendToAnalytics({
              name: 'Long Task',
              value: entry.duration,
              id: `longtask-${Date.now()}`,
              delta: 0,
              rating: entry.duration < 50 ? 'good' : entry.duration < 100 ? 'needs-improvement' : 'poor'
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    }
  }, []);
};

// Component to use in App.jsx
const PerformanceMonitor = () => {
  usePerformanceMonitoring();
  return null;
};

export default PerformanceMonitor;