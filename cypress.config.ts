import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      on('task', {
        // Database seeding tasks
        'db:seed': async (data) => {
          // Seed test database with data
          return null;
        },
        'db:cleanup': async () => {
          // Clean up test data
          return null;
        },
      });

      // Load environment variables for different test environments
      const environment = config.env.testEnv || 'local';
      const envConfig = {
        local: {
          apiUrl: 'http://localhost:3000/api/v1',
          supabaseUrl: 'http://localhost:54321',
        },
        staging: {
          apiUrl: 'https://staging.blessed-horizon.com/api/v1',
          supabaseUrl: 'https://staging-project.supabase.co',
        },
      };

      return {
        ...config,
        env: {
          ...config.env,
          ...envConfig[environment],
        },
      };
    },

    env: {
      // Test user credentials
      testUserEmail: 'cypress@blessed-horizon.com',
      testUserPassword: 'CypressTest123!',
      
      // Test payment details
      testCardNumber: '4242424242424242',
      testCardExpiry: '12/25',
      testCardCvc: '123',
      
      // Feature flags for tests
      skipPaymentTests: false,
      skipEmailTests: true,
    },

    // Cypress Testing Library
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Exclude certain specs in CI
    excludeSpecPattern: process.env.CI ? ['**/debug.cy.ts'] : [],
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
});
