import axios from 'axios';
import { expect } from 'chai';

const BASE_URL = process.env.TEST_URL || process.argv[2]?.split('=')[1] || 'http://localhost:3000';
const TIMEOUT = 30000;

console.log(`Running smoke tests against: ${BASE_URL}`);

describe('Production Smoke Tests', function() {
  this.timeout(TIMEOUT);

  describe('Core Pages', () => {
    const pages = [
      { path: '/', name: 'Homepage', mustContain: 'Blessed-Horizon' },
      { path: '/campaigns', name: 'Campaigns List', mustContain: 'Browse Campaigns' },
      { path: '/about', name: 'About Page', mustContain: 'Our Mission' },
      { path: '/how-it-works', name: 'How It Works', mustContain: 'transparency' },
      { path: '/contact', name: 'Contact Page', mustContain: 'Get in Touch' },
    ];

    pages.forEach(({ path, name, mustContain }) => {
      it(`should load ${name}`, async () => {
        const response = await axios.get(`${BASE_URL}${path}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500,
        });
        
        expect(response.status).to.equal(200);
        expect(response.headers['content-type']).to.include('text/html');
        expect(response.data).to.include(mustContain);
      });
    });
  });

  describe('API Health Checks', () => {
    it('should have working health endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'healthy');
      expect(response.data).to.have.property('version');
      expect(response.data).to.have.property('timestamp');
    });

    it('should have working API v1 status', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/status`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('api_version', 'v1');
      expect(response.data).to.have.property('services');
      
      // Check critical services
      const services = response.data.services;
      expect(services.database).to.equal('connected');
      expect(services.storage).to.equal('connected');
      expect(services.payment).to.equal('connected');
    });
  });

  describe('Critical Features', () => {
    it('should load active campaigns', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/campaigns?status=active&limit=5`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data).to.have.property('data');
      expect(response.data.data).to.be.an('array');
    });

    it('should have working search functionality', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/campaigns/search?q=help`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
    });

    it('should have Stripe integration ready', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/payments/config`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('publishableKey');
      expect(response.data.publishableKey).to.match(/^pk_(test|live)_/);
    });
  });

  describe('Security Headers', () => {
    it('should have proper security headers', async () => {
      const response = await axios.get(`${BASE_URL}/`);
      const headers = response.headers;
      
      // Check critical security headers
      expect(headers).to.have.property('x-content-type-options', 'nosniff');
      expect(headers).to.have.property('x-frame-options');
      expect(headers).to.have.property('strict-transport-security');
      
      // CSP should be present
      expect(headers).to.have.property('content-security-policy');
    });
  });

  describe('Performance Checks', () => {
    it('should load homepage within acceptable time', async () => {
      const start = Date.now();
      
      await axios.get(`${BASE_URL}/`, {
        timeout: 5000,
      });
      
      const loadTime = Date.now() - start;
      expect(loadTime).to.be.lessThan(3000); // Should load in under 3 seconds
    });

    it('should have gzip compression enabled', async () => {
      const response = await axios.get(`${BASE_URL}/`, {
        headers: {
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      
      expect(response.headers['content-encoding']).to.equal('gzip');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await axios.get(`${BASE_URL}/non-existent-page`, {
        validateStatus: () => true,
      });
      
      expect(response.status).to.equal(404);
      expect(response.data).to.include('Page Not Found');
    });

    it('should handle API errors gracefully', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/campaigns/invalid-id`, {
        validateStatus: () => true,
      });
      
      expect(response.status).to.be.oneOf([400, 404]);
      expect(response.data).to.have.property('success', false);
      expect(response.data).to.have.property('error');
    });
  });

  describe('Critical User Flows', () => {
    it('should allow viewing campaign details', async () => {
      // First get a campaign
      const listResponse = await axios.get(`${BASE_URL}/api/v1/campaigns?limit=1`);
      
      if (listResponse.data.data.length > 0) {
        const campaignId = listResponse.data.data[0].id;
        
        // Then try to view it
        const detailResponse = await axios.get(`${BASE_URL}/api/v1/campaigns/${campaignId}`);
        
        expect(detailResponse.status).to.equal(200);
        expect(detailResponse.data.success).to.equal(true);
        expect(detailResponse.data.data).to.have.property('id', campaignId);
      }
    });
  });
});

// Run tests and exit with appropriate code
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
