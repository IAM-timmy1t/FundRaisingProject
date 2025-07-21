describe('Campaign Creation Flow', () => {
  beforeEach(() => {
    // Login as test user
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    cy.visit('/campaigns/create');
  });

  it('should create a new campaign successfully', () => {
    // Fill in campaign details
    cy.get('[data-testid="campaign-title"]').type('Help Build Our Community Church');
    
    cy.get('[data-testid="campaign-description"]').type(
      'We are raising funds to build a new church that will serve our growing community. ' +
      'The church will provide a place of worship, community gatherings, and youth programs. ' +
      'Your generous donations will help us achieve this blessed goal.'
    );

    // Select category
    cy.get('[data-testid="campaign-category"]').select('religious');
    
    // Set goal amount
    cy.get('[data-testid="goal-amount"]').type('50000');
    
    // Set end date (3 months from now)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    cy.get('[data-testid="end-date"]').type(endDate.toISOString().split('T')[0]);
    
    // Upload media
    cy.get('[data-testid="media-upload"]').selectFile('cypress/fixtures/church-render.jpg', {
      action: 'drag-drop'
    });
    
    // Wait for upload to complete
    cy.get('[data-testid="upload-success"]').should('be.visible');
    
    // Select beneficiary type
    cy.get('[data-testid="beneficiary-type-organization"]').click();
    
    // Add beneficiary details
    cy.get('[data-testid="beneficiary-name"]').type('Grace Community Church');
    cy.get('[data-testid="beneficiary-location"]').type('Dallas, Texas');
    
    // Submit form
    cy.get('[data-testid="submit-campaign"]').click();
    
    // Verify moderation notice
    cy.get('[data-testid="moderation-notice"]').should('be.visible');
    cy.contains('Your campaign has been submitted for review').should('be.visible');
    
    // Should redirect to campaign list
    cy.url().should('include', '/campaigns/my-campaigns');
    
    // Verify campaign appears in list with pending status
    cy.get('[data-testid="campaign-list"]').within(() => {
      cy.contains('Help Build Our Community Church').should('be.visible');
      cy.get('[data-testid="status-pending"]').should('be.visible');
    });
  });

  it('should validate required fields', () => {
    // Try to submit without filling required fields
    cy.get('[data-testid="submit-campaign"]').click();
    
    // Check for validation errors
    cy.get('[data-testid="error-title"]').should('contain', 'Title is required');
    cy.get('[data-testid="error-description"]').should('contain', 'Description is required');
    cy.get('[data-testid="error-goal"]').should('contain', 'Goal amount is required');
    cy.get('[data-testid="error-category"]').should('contain', 'Category is required');
  });

  it('should auto-save draft while filling form', () => {
    // Type campaign title
    cy.get('[data-testid="campaign-title"]').type('Draft Campaign Test');
    
    // Wait for auto-save
    cy.wait(2000);
    
    // Reload page
    cy.reload();
    
    // Check if draft was restored
    cy.get('[data-testid="draft-restored-notice"]').should('be.visible');
    cy.get('[data-testid="campaign-title"]').should('have.value', 'Draft Campaign Test');
  });

  it('should calculate and display trust score preview', () => {
    // Fill in high-quality campaign details
    cy.get('[data-testid="campaign-title"]').type('Building Hope: New Community Center');
    
    cy.get('[data-testid="campaign-description"]').type(
      'Our mission is to build a state-of-the-art community center that will serve ' +
      'underprivileged youth in our area. The center will offer after-school programs, ' +
      'tutoring services, sports facilities, and mentorship opportunities. We have ' +
      'partnered with local schools and received endorsements from community leaders. ' +
      'The project has been carefully planned with detailed architectural drawings ' +
      'and a transparent budget breakdown. All funds will be managed by our registered ' +
      '501(c)(3) nonprofit organization with regular progress updates.'
    );
    
    // Upload multiple media files
    cy.get('[data-testid="media-upload"]').selectFile([
      'cypress/fixtures/architectural-plans.pdf',
      'cypress/fixtures/community-support-letter.pdf',
      'cypress/fixtures/site-photo.jpg'
    ]);
    
    // Wait for trust score calculation
    cy.get('[data-testid="trust-score-preview"]').should('be.visible');
    
    // Verify high trust score
    cy.get('[data-testid="trust-score-value"]').then(($score) => {
      const score = parseInt($score.text());
      expect(score).to.be.greaterThan(70);
    });
    
    // Check trust score factors
    cy.get('[data-testid="trust-score-details"]').click();
    cy.get('[data-testid="score-factor-description"]').should('contain', 'Excellent');
    cy.get('[data-testid="score-factor-media"]').should('contain', 'Good');
    cy.get('[data-testid="score-factor-transparency"]').should('contain', 'High');
  });
});
