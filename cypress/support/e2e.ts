// ***********************************************************
// This file is processed and loaded automatically before test files.
// ***********************************************************

import './commands';
import '@testing-library/cypress/add-commands';

// Configure Cypress
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing tests due to uncaught exceptions
  // from the application (e.g., third-party scripts)
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// Add custom viewport sizes
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport('iphone-x');
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport('ipad-2');
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720);
});

// Before each test
beforeEach(() => {
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set default viewport
  cy.setDesktopViewport();
  
  // Intercept and stub external services
  cy.intercept('POST', '**/api/v1/analytics/**', { statusCode: 200 });
  cy.intercept('GET', 'https://www.google-analytics.com/**', { statusCode: 200 });
});
