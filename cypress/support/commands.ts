/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Login with email and password
     */
    login(email: string, password: string): Chainable<void>;
    
    /**
     * Logout the current user
     */
    logout(): Chainable<void>;
    
    /**
     * Create a test campaign
     */
    createTestCampaign(campaign: Partial<Campaign>): Chainable<string>;
    
    /**
     * Wait for Stripe Elements to load
     */
    waitForStripe(): Chainable<void>;
    
    /**
     * Fill Stripe card element
     */
    fillStripeCard(cardNumber: string, expiry: string, cvc: string): Chainable<void>;
    
    /**
     * Check accessibility of current page
     */
    checkA11y(context?: any, options?: any): Chainable<void>;
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for redirect after successful login
    cy.url().should('not.include', '/auth/login');
    
    // Verify auth token exists
    cy.window().its('localStorage').invoke('getItem', 'auth-token').should('exist');
  });
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/auth/login');
});

// Create test campaign
Cypress.Commands.add('createTestCampaign', (campaignData) => {
  const defaultCampaign = {
    title: 'Test Campaign',
    description: 'This is a test campaign',
    goal_amount: 10000,
    category: 'religious',
    beneficiary_type: 'individual',
    status: 'active',
    trust_score: 75,
  };
  
  const campaign = { ...defaultCampaign, ...campaignData };
  
  return cy.task('db:seed', { campaigns: [campaign] }).then((result: any) => {
    return result.campaigns[0].id;
  });
});

// Wait for Stripe Elements
Cypress.Commands.add('waitForStripe', () => {
  cy.window().its('Stripe').should('exist');
  cy.get('iframe[name^="__privateStripeFrame"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
});

// Fill Stripe card fields
Cypress.Commands.add('fillStripeCard', (cardNumber: string, expiry: string, cvc: string) => {
  // Card number
  cy.get('iframe[title*="Secure card number"]')
    .its('0.contentDocument')
    .its('body')
    .find('input[name="cardnumber"]')
    .type(cardNumber);
    
  // Expiry date
  cy.get('iframe[title*="Secure expiration date"]')
    .its('0.contentDocument')
    .its('body')
    .find('input[name="exp-date"]')
    .type(expiry);
    
  // CVC
  cy.get('iframe[title*="Secure CVC"]')
    .its('0.contentDocument')
    .its('body')
    .find('input[name="cvc"]')
    .type(cvc);
});

// Accessibility testing
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.injectAxe();
  cy.checkA11y(context, options);
});

// Helper to wait for API calls
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.intercept('GET', '/api/v1/**').as('apiCall');
  cy.wait(`@${alias}`, { timeout: 10000 });
});
