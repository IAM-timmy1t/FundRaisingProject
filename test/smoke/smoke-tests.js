import { chromium } from 'playwright';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.PRODUCTION_URL || 'https://blessed-horizon.com';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

const tests = [
  {
    name: 'Homepage loads successfully',
    run: async (page) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('h1', { timeout: 10000 });
      const title = await page.title();
      if (!title.includes('Blessed Horizon')) {
        throw new Error(`Expected title to contain "Blessed Horizon", got "${title}"`);
      }
    },
  },
  {
    name: 'API health check',
    run: async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    },
  },
  {
    name: 'Campaign browse page loads',
    run: async (page) => {
      await page.goto(`${BASE_URL}/campaigns`);
      await page.waitForSelector('.campaign-card', { timeout: 15000 });
      const campaigns = await page.$$('.campaign-card');
      if (campaigns.length === 0) {
        throw new Error('No campaigns found on browse page');
      }
    },
  },
  {
    name: 'User can log in',
    run: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER_EMAIL);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
    },
  },
  {
    name: 'Search functionality works',
    run: async (page) => {
      await page.goto(`${BASE_URL}/campaigns`);
      await page.fill('input[placeholder*="Search"]', 'test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      // Verify search results updated
      const results = await page.$$('.campaign-card');
      console.log(`Found ${results.length} search results`);
    },
  },
  {
    name: 'Donation flow accessible',
    run: async (page) => {
      await page.goto(`${BASE_URL}/campaigns`);
      const firstCampaign = await page.$('.campaign-card');
      if (!firstCampaign) {
        throw new Error('No campaigns available for donation test');
      }
      await firstCampaign.click();
      await page.waitForSelector('button:has-text("Donate")', { timeout: 10000 });
      await page.click('button:has-text("Donate")');
      // Verify Stripe elements loaded
      await page.waitForSelector('iframe[title*="Stripe"]', { timeout: 15000 });
    },
  },
];

async function runSmokeTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];
  let passed = 0;
  let failed = 0;

  console.log(`\n🔥 Running smoke tests against ${BASE_URL}\n`);

  for (const test of tests) {
    const page = await context.newPage();
    const startTime = Date.now();
    
    try {
      await test.run(page);
      const duration = Date.now() - startTime;
      console.log(`✅ ${test.name} (${duration}ms)`);
      results.push({ name: test.name, status: 'passed', duration });
      passed++;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${test.name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      results.push({ name: test.name, status: 'failed', duration, error: error.message });
      failed++;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${tests.length}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runSmokeTests().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
