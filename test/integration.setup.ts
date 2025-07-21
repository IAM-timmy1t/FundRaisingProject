import '@testing-library/jest-dom';
import { expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Test Supabase instance
let testSupabase;

beforeAll(async () => {
  // Setup test database connection
  process.env.VITE_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
  process.env.VITE_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
  
  // Initialize test database
  // You might want to run migrations or seed data here
});

afterAll(async () => {
  // Cleanup test database
  // Close connections
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Clear test data after each test
});

// Mock implementations for integration tests
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    elements: vi.fn(() => ({
      create: vi.fn(() => ({
        mount: vi.fn(),
        unmount: vi.fn(),
        destroy: vi.fn(),
      })),
    })),
    confirmPayment: vi.fn(() => Promise.resolve({ error: null })),
    createPaymentMethod: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

// Mock fetch for specific endpoints if needed
global.fetch = vi.fn((url, options) => {
  // Return different responses based on URL
  if (url.includes('/api/campaigns')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  }
  
  // Default response
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
});

// Helper function to reset database between tests
export async function resetTestDatabase() {
  // Implementation depends on your test setup
  console.log('Resetting test database...');
}

// Helper function to seed test data
export async function seedTestData(data) {
  // Implementation depends on your test setup
  console.log('Seeding test data...');
}
