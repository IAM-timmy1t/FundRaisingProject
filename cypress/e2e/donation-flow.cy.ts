describe('Donation Flow', () => {
  let campaignId: string;

  before(() => {
    // Create a test campaign
    cy.task('db:seed', {
      campaigns: [{
        id: 'test-campaign-001',
        title: 'Emergency Medical Fund',
        description: 'Helping our community member with urgent medical expenses',
        goal_amount: 10000,
        current_amount: 3500,
        status: 'active',
        trust_score: 85,
        beneficiary_type: 'individual',
      }]
    });
    campaignId = 'test-campaign-001';
  });

  after(() => {
    cy.task('db:cleanup');
  });

  it('should complete a donation successfully', () => {
    // Visit campaign page
    cy.visit(`/campaigns/${campaignId}`);
    
    // Verify campaign details are displayed
    cy.get('[data-testid="campaign-title"]').should('contain', 'Emergency Medical Fund');
    cy.get('[data-testid="goal-progress"]').should('contain', '35%');
    cy.get('[data-testid="trust-score"]').should('contain', '85');
    
    // Click donate button
    cy.get('[data-testid="donate-button"]').click();
    
    // Select donation amount
    cy.get('[data-testid="amount-100"]').click();
    
    // Or enter custom amount
    cy.get('[data-testid="custom-amount"]').clear().type('250');
    
    // Add optional message
    cy.get('[data-testid="donation-message"]').type('Praying for quick recovery! God bless.');
    
    // Choose to display name
    cy.get('[data-testid="anonymous-donation"]').should('not.be.checked');
    
    // Continue to payment
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Fill in card details using Stripe Elements
    cy.get('iframe[title*="Secure card number"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body).find('input[name="cardnumber"]').type(Cypress.env('testCardNumber'));
    });
    
    cy.get('iframe[title*="Secure expiration date"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body).find('input[name="exp-date"]').type(Cypress.env('testCardExpiry'));
    });
    
    cy.get('iframe[title*="Secure CVC"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body).find('input[name="cvc"]').type(Cypress.env('testCardCvc'));
    });
    
    // Enter billing details
    cy.get('[data-testid="billing-name"]').type('John Donor');
    cy.get('[data-testid="billing-email"]').type('donor@example.com');
    cy.get('[data-testid="billing-zip"]').type('75001');
    
    // Submit donation
    cy.get('[data-testid="submit-donation"]').click();
    
    // Wait for processing
    cy.get('[data-testid="processing-donation"]').should('be.visible');
    
    // Verify success page
    cy.get('[data-testid="donation-success"]', { timeout: 15000 }).should('be.visible');
    cy.contains('Thank you for your generous donation!').should('be.visible');
    cy.get('[data-testid="donation-amount"]').should('contain', '$250');
    cy.get('[data-testid="donation-receipt"]').should('be.visible');
    
    // Check email receipt option
    cy.get('[data-testid="email-receipt"]').click();
    cy.get('[data-testid="receipt-sent"]').should('be.visible');
    
    // Return to campaign
    cy.get('[data-testid="back-to-campaign"]').click();
    
    // Verify updated campaign progress
    cy.get('[data-testid="current-amount"]').should('contain', '$3,750');
    cy.get('[data-testid="goal-progress"]').should('contain', '37.5%');
    
    // Verify donation appears in recent donations
    cy.get('[data-testid="recent-donations"]').within(() => {
      cy.contains('John D.').should('be.visible');
      cy.contains('$250').should('be.visible');
      cy.contains('Praying for quick recovery!').should('be.visible');
    });
  });

  it('should handle anonymous donations', () => {
    cy.visit(`/campaigns/${campaignId}`);
    cy.get('[data-testid="donate-button"]').click();
    
    // Select amount and check anonymous
    cy.get('[data-testid="amount-50"]').click();
    cy.get('[data-testid="anonymous-donation"]').check();
    
    // Complete donation flow (abbreviated for brevity)
    cy.get('[data-testid="continue-to-payment"]').click();
    // ... fill payment details ...
    cy.get('[data-testid="submit-donation"]').click();
    
    // Verify anonymous donation in list
    cy.visit(`/campaigns/${campaignId}`);
    cy.get('[data-testid="recent-donations"]').within(() => {
      cy.contains('Anonymous').should('be.visible');
      cy.contains('$50').should('be.visible');
    });
  });

  it('should validate minimum donation amount', () => {
    cy.visit(`/campaigns/${campaignId}`);
    cy.get('[data-testid="donate-button"]').click();
    
    // Try to enter amount below minimum
    cy.get('[data-testid="custom-amount"]').type('0.50');
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Should show validation error
    cy.get('[data-testid="amount-error"]').should('contain', 'Minimum donation is $1');
  });

  it('should handle payment failures gracefully', () => {
    cy.visit(`/campaigns/${campaignId}`);
    cy.get('[data-testid="donate-button"]').click();
    
    cy.get('[data-testid="amount-100"]').click();
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Use card number that triggers decline
    cy.get('iframe[title*="Secure card number"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body).find('input[name="cardnumber"]').type('4000000000000002'); // Decline card
    });
    
    // Complete form and submit
    // ... fill other details ...
    cy.get('[data-testid="submit-donation"]').click();
    
    // Should show error message
    cy.get('[data-testid="payment-error"]').should('be.visible');
    cy.contains('Your card was declined').should('be.visible');
    
    // Should remain on payment form to retry
    cy.get('[data-testid="submit-donation"]').should('be.visible');
  });

  it('should show donation impact calculator', () => {
    cy.visit(`/campaigns/${campaignId}`);
    
    // Check impact calculator
    cy.get('[data-testid="impact-calculator"]').within(() => {
      cy.get('[data-testid="impact-amount"]').type('500');
      cy.get('[data-testid="calculate-impact"]').click();
      
      // Should show what the donation achieves
      cy.get('[data-testid="impact-result"]').should('be.visible');
      cy.contains('Your $500 donation will').should('be.visible');
    });
  });
});
