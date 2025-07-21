// Google Analytics 4 and Custom Analytics Configuration
import ReactGA from 'react-ga4';
import { Analytics } from '@segment/analytics-node';
import mixpanel from 'mixpanel-browser';
import * as amplitude from '@amplitude/analytics-browser';

// Initialize Google Analytics 4
export const initGA4 = () => {
  ReactGA.initialize(process.env.VITE_GA4_MEASUREMENT_ID, {
    gaOptions: {
      siteSpeedSampleRate: 100,
      sampleRate: 100,
    },
    gtagOptions: {
      send_page_view: false,
      custom_map: {
        dimension1: 'user_role',
        dimension2: 'campaign_category',
        dimension3: 'trust_score_range',
      },
    },
  });
};

// Initialize Segment Analytics
export const initSegment = () => {
  const analytics = new Analytics({
 n    writeKey: process.env.SEGMENT_WRITE_KEY,
    flushAt: 20,
    flushInterval: 10000,
  });
  return analytics;
};

// Initialize Mixpanel
export const initMixpanel = () => {
  mixpanel.init(process.env.VITE_MIXPANEL_PROJECT_TOKEN, {
    debug: process.env.NODE_ENV !== 'production',
    track_pageview: true,
    persistence: 'localStorage',
    ignore_dnt: false,
    batch_requests: true,
    batch_size: 10,
    batch_flush_interval_ms: 2000,
  });
};

// Initialize Amplitude
export const initAmplitude = () => {
  amplitude.init(process.env.VITE_AMPLITUDE_API_KEY, {
    defaultTracking: {
      sessions: true,
      pageViews: true,
      formInteractions: true,
      fileDownloads: true,
    },
    trackingOptions: {
      ipAddress: false,
      language: true,
      platform: true,
    },
  });
};

// Custom event tracking wrapper
class UnifiedAnalytics {
  constructor() {
    this.segment = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    initGA4();
    this.segment = initSegment();
    initMixpanel();
    initAmplitude();
    
    this.initialized = true;
  }

  // User identification
  identify(userId, traits = {}) {
    // Google Analytics
    ReactGA.set({ userId });
    
    // Segment
    this.segment?.identify({ userId, traits });
    
    // Mixpanel
    mixpanel.identify(userId);
    mixpanel.people.set(traits);
    
    // Amplitude
    amplitude.setUserId(userId);
    amplitude.setUserProperties(traits);
  }

  // Page view tracking
  trackPageView(path, title, properties = {}) {
    // Google Analytics
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title,
      ...properties,
    });
    
    // Segment
    this.segment?.page({
      name: title,
      path,
      properties,
    });
    
    // Mixpanel
    mixpanel.track('Page Viewed', {
      path,
      title,
      ...properties,
    });
    
    // Amplitude
    amplitude.track('Page Viewed', {
      path,
      title,
      ...properties,
    });
  }

  // Custom event tracking
  track(event, properties = {}) {
    // Google Analytics
    ReactGA.event({
      category: properties.category || 'General',
      action: event,
      label: properties.label,
      value: properties.value,
      ...properties,
    });
    
    // Segment
    this.segment?.track({
      event,
      properties,
    });
    
    // Mixpanel
    mixpanel.track(event, properties);
    
    // Amplitude
    amplitude.track(event, properties);
  }

  // Revenue tracking
  trackRevenue(amount, properties = {}) {
    const revenueProps = {
      ...properties,
      revenue: amount,
      currency: properties.currency || 'USD',
    };

    // Google Analytics (Enhanced Ecommerce)
    ReactGA.event({
      category: 'Ecommerce',
      action: 'purchase',
      value: amount,
      ...revenueProps,
    });
    
    // Segment
    this.segment?.track({
      event: 'Order Completed',
      properties: revenueProps,
    });
    
    // Mixpanel
    mixpanel.track('Revenue', revenueProps);
    mixpanel.people.track_charge(amount, revenueProps);
    
    // Amplitude
    const revenue = new amplitude.Revenue()
      .setProductId(properties.productId || 'donation')
      .setPrice(amount)
      .setQuantity(1);
    amplitude.revenue(revenue);
  }

  // Campaign-specific events
  trackCampaignEvent(event, campaignId, properties = {}) {
    this.track(event, {
      campaign_id: campaignId,
      ...properties,
    });
  }

  // Donation tracking
  trackDonation(amount, campaignId, paymentMethod, properties = {}) {
    const donationProps = {
      amount,
      campaign_id: campaignId,
      payment_method: paymentMethod,
      ...properties,
    };

    this.track('Donation Completed', donationProps);
    this.trackRevenue(amount, donationProps);
  }

  // Trust score events
  trackTrustScoreEvent(event, campaignId, score, properties = {}) {
    this.track(event, {
      campaign_id: campaignId,
      trust_score: score,
      trust_score_range: this.getTrustScoreRange(score),
      ...properties,
    });
  }

  // Utility functions
  getTrustScoreRange(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  // Session tracking
  startSession() {
    this.track('Session Started', {
      timestamp: new Date().toISOString(),
    });
  }

  endSession(duration) {
    this.track('Session Ended', {
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  // Error tracking
  trackError(error, properties = {}) {
    this.track('Error Occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...properties,
    });
  }

  // Performance tracking
  trackPerformance(metric, value, properties = {}) {
    this.track('Performance Metric', {
      metric_name: metric,
      metric_value: value,
      ...properties,
    });
  }
}

// Export singleton instance
export const analytics = new UnifiedAnalytics();

// React hooks for analytics
export const useAnalytics = () => {
  return analytics;
};

// HOC for page tracking
export const withPageTracking = (Component, pageName) => {
  return (props) => {
    React.useEffect(() => {
      analytics.trackPageView(window.location.pathname, pageName);
    }, []);
    
    return <Component {...props} />;
  };
};

export default analytics;