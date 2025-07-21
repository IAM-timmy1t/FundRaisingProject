// Prometheus Metrics Configuration
import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  prefix: 'blessed_horizon_',
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'blessed_horizon_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'blessed_horizon_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeDonations = new client.Gauge({
  name: 'blessed_horizon_active_donations',
  help: 'Number of active donation sessions',
});

const donationAmount = new client.Histogram({
  name: 'blessed_horizon_donation_amount_usd',
  help: 'Donation amounts in USD',
  labelNames: ['campaign_id', 'payment_method'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 5000],
});

const campaignGoalProgress = new client.Gauge({
  name: 'blessed_horizon_campaign_goal_progress_percent',
  help: 'Campaign goal completion percentage',
  labelNames: ['campaign_id', 'campaign_name'],
});

const trustScoreValue = new client.Gauge({
  name: 'blessed_horizon_trust_score',
  help: 'Campaign trust score value',
  labelNames: ['campaign_id', 'campaign_name'],
});

const paymentProcessingTime = new client.Histogram({
  name: 'blessed_horizon_payment_processing_seconds',
  help: 'Time to process payments',
  labelNames: ['payment_method', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

const databaseQueryDuration = new client.Histogram({
  name: 'blessed_horizon_database_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

const cacheHitRate = new client.Counter({
  name: 'blessed_horizon_cache_hits_total',
  help: 'Cache hit rate',
  labelNames: ['cache_type', 'hit'],
});

const activeUsers = new client.Gauge({
  name: 'blessed_horizon_active_users',
  help: 'Number of active users',
  labelNames: ['user_type'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeDonations);
register.registerMetric(donationAmount);
register.registerMetric(campaignGoalProgress);
register.registerMetric(trustScoreValue);
register.registerMetric(paymentProcessingTime);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRate);
register.registerMetric(activeUsers);

// Middleware for HTTP metrics
export const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
};

// Metrics endpoint handler
export const metricsHandler = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// Business metrics helpers
export const recordDonation = (amount, campaignId, paymentMethod) => {
  donationAmount.observe(
    { campaign_id: campaignId, payment_method: paymentMethod },
    amount
  );
};

export const updateCampaignProgress = (campaignId, campaignName, progressPercent) => {
  campaignGoalProgress.set(
    { campaign_id: campaignId, campaign_name: campaignName },
    progressPercent
  );
};

export const updateTrustScore = (campaignId, campaignName, score) => {
  trustScoreValue.set(
    { campaign_id: campaignId, campaign_name: campaignName },
    score
  );
};

export const recordPaymentProcessing = (duration, paymentMethod, status) => {
  paymentProcessingTime.observe(
    { payment_method: paymentMethod, status },
    duration
  );
};

export const recordDatabaseQuery = (duration, operation, table) => {
  databaseQueryDuration.observe(
    { operation, table },
    duration
  );
};

export const recordCacheAccess = (cacheType, hit) => {
  cacheHitRate.inc({
    cache_type: cacheType,
    hit: hit ? 'true' : 'false',
  });
};

export const updateActiveUsers = (userType, count) => {
  activeUsers.set({ user_type: userType }, count);
};

export const incrementActiveDonations = () => activeDonations.inc();
export const decrementActiveDonations = () => activeDonations.dec();

export default {
  register,
  prometheusMiddleware,
  metricsHandler,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeDonations,
    donationAmount,
    campaignGoalProgress,
    trustScoreValue,
    paymentProcessingTime,
    databaseQueryDuration,
    cacheHitRate,
    activeUsers,
  },
};