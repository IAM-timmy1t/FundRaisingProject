// Test Email Notification System
// This is a standalone test script for email templates

// Mock emailService for testing
const emailService = {
  async sendTestEmail(email, template) {
    console.log(`Sending test ${template} email to ${email}`);
    // In production, this would call the actual Edge Function
    const response = await fetch('/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: email,
        template: template,
        templateData: getTestDataForTemplate(template)
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  async sendEmail(data) {
    console.log(`Sending email to ${data.to} with template ${data.template}`);
    // Mock implementation
    return { success: true };
  }
};

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const DELAY_BETWEEN_TESTS = 2000; // 2 seconds between tests

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✓ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`✗ ${testName}`);
    if (error) {
      console.log(`  Error: ${error.message}`);
    }
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
  }
}

// Helper function to delay between tests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get test data for templates
function getTestDataForTemplate(templateName) {
  const testData = {
    donation: {
      donor_name: 'John Doe',
      amount: 100,
      currency: 'USD',
      campaign_title: 'Help Build a School in Kenya',
      campaign_id: 'test-campaign-1',
      current_amount: 5500,
      goal_amount: 10000,
      progress_percentage: 55,
      days_remaining: 15,
      donor_message: 'Happy to support this wonderful cause!'
    },
    update: {
      campaign_title: 'Help Build a School in Kenya',
      campaign_id: 'test-campaign-1',
      recipient_name: 'Sarah Johnson',
      update_title: 'Construction Progress Update',
      update_content: '<p>Great news! The foundation has been laid and walls are going up. Thank you for your continued support!</p>',
      update_image: 'https://example.com/update-image.jpg',
      update_id: 'update-123',
      current_amount: 5500,
      goal_amount: 10000,
      progress_percentage: 55,
      currency: 'USD',
      spend_amount: 2000,
      spend_category: 'Construction Materials'
    },
    'goal-reached': {
      campaign_title: 'Help Build a School in Kenya',
      campaign_id: 'test-campaign-1',
      goal_amount: 10000,
      current_amount: 10500,
      currency: 'USD',
      donor_count: 45,
      average_donation: 233,
      days_to_goal: 22,
      is_donor: true,
      is_recipient: false,
      user_donation_amount: 250
    },
    'campaign-ending': {
      campaign_title: 'Help Build a School in Kenya',
      campaign_id: 'test-campaign-1',
      time_left: '48 hours',
      current_amount: 8500,
      goal_amount: 10000,
      amount_needed: 1500,
      currency: 'USD',
      progress_percentage: 85,
      is_donor: false,
      is_goal_reached: false,
      recent_update: 'Construction is progressing well!',
      recent_update_date: '2 days ago'
    },
    'trust-score-change': {
      user_name: 'John Doe',
      old_score: 75,
      new_score: 82,
      score_change: 7,
      score_increased: true,
      metrics: {
        update_timeliness: 35,
        update_timeliness_percentage: 87.5,
        spend_accuracy: 26,
        spend_accuracy_percentage: 86.7,
        donor_sentiment: 12,
        donor_sentiment_percentage: 80,
        identity_verification: 9,
        identity_verification_percentage: 90
      },
      reasons: [
        'Posted regular campaign updates',
        'Uploaded receipts for all expenses',
        'Positive donor feedback received'
      ]
    },
    'daily-digest': {
      user_name: 'Test User',
      donations: [
        {
          donor_name: 'John Doe',
          amount: 50,
          currency: 'USD',
          campaign_title: 'Test Campaign 1'
        },
        {
          donor_name: 'Jane Smith',
          amount: 100,
          currency: 'USD',
          campaign_title: 'Test Campaign 2'
        }
      ],
      updates: [
        {
          campaign_title: 'Test Campaign 1',
          update_title: 'Construction Progress'
        }
      ],
      milestones: [
        {
          campaign_title: 'Test Campaign 2',
          milestone_text: 'reached 50% of goal'
        }
      ],
      total_donations_amount: 150,
      currency: 'USD',
      active_campaigns: [
        {
          campaign_id: 'test-1',
          title: 'Test Campaign 1',
          progress_percentage: 75,
          days_remaining: 10,
          ending_soon: false
        }
      ]
    },
    'weekly-digest': {
      user_name: 'Test User',
      week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      week_end: new Date(),
      total_donations: 25,
      total_amount: 5000,
      currency: 'USD',
      top_campaigns: [
        {
          title: 'Build a School',
          amount_raised: 2500,
          currency: 'USD',
          progress_percentage: 50,
          donor_count: 15,
          update_count: 3
        }
      ],
      upcoming_endings: [
        {
          title: 'Medical Emergency Fund',
          days_left: 3,
          percentage_to_goal: 85
        }
      ],
      platform_stats: {
        campaigns_funded: 10,
        total_raised_week: 50000,
        lives_impacted: 500
      }
    }
  };

  return testData[templateName] || {};
}

// Test all email templates
async function testAllEmailTemplates() {
  console.log('\n🧪 Testing Email Notification System\n');
  console.log(`Sending test emails to: ${TEST_EMAIL}\n`);

  const templates = [
    'donation',
    'update',
    'goal-reached',
    'campaign-ending',
    'trust-score-change',
    'daily-digest',
    'weekly-digest'
  ];

  for (const template of templates) {
    console.log(`\nTesting ${template} email...`);
    try {
      await emailService.sendTestEmail(TEST_EMAIL, template);
      logTest(`${template} Email`, true);
    } catch (error) {
      logTest(`${template} Email`, false, error);
    }
    await delay(DELAY_BETWEEN_TESTS);
  }
}

// Test email tracking and analytics
async function testEmailTracking() {
  console.log('\n\nTesting Email Tracking...');
  
  try {
    // Test sending email with tracking
    const result = await emailService.sendEmail({
      to: TEST_EMAIL,
      subject: 'Test Email with Tracking',
      html: '<h1>Test Email</h1><p>This email tests click and open tracking.</p><a href="https://blessed-horizon.com">Click me</a>',
      text: 'Test email for tracking',
      categories: ['test', 'tracking'],
      customArgs: {
        test_id: 'tracking-test-' + Date.now(),
        user_id: 'test-user'
      }
    });
    
    logTest('Email Tracking', true);
  } catch (error) {
    logTest('Email Tracking', false, error);
  }
}

// Test email validation
async function testEmailValidation() {
  console.log('\n\nTesting Email Validation...');
  
  // Test invalid email
  try {
    await emailService.sendEmail({
      to: 'invalid-email',
      subject: 'Test',
      text: 'Test'
    });
    logTest('Email Validation (should fail)', false);
  } catch (error) {
    logTest('Email Validation', true); // Expected to fail
  }
}

// Test attachment handling
async function testAttachments() {
  console.log('\n\nTesting Email Attachments...');
  
  try {
    const csvContent = Buffer.from('Name,Amount\nJohn Doe,100\nJane Smith,200').toString('base64');
    
    await emailService.sendEmail({
      to: TEST_EMAIL,
      subject: 'Test Email with Attachment',
      html: '<h1>Test Email</h1><p>This email includes a CSV attachment.</p>',
      text: 'Test email with CSV attachment',
      attachments: [{
        content: csvContent,
        filename: 'test-donations.csv',
        type: 'text/csv',
        disposition: 'attachment'
      }],
      categories: ['test', 'attachment']
    });
    
    logTest('Email Attachments', true);
  } catch (error) {
    logTest('Email Attachments', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n===========================================');
  console.log('   Email Notification System Test Suite');
  console.log('===========================================');
  
  // Check environment
  console.log('\nChecking email service configuration...');
  console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY ? '✓ Configured' : '✗ Not configured');
  console.log('SMTP Credentials:', process.env.SMTP_USER ? '✓ Configured' : '✗ Not configured');
  
  if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_USER) {
    console.log('\n⚠️  Warning: No email service configured!');
    console.log('Please set SENDGRID_API_KEY or SMTP credentials in environment variables.\n');
  }
  
  // Run all tests
  await testAllEmailTemplates();
  await testEmailTracking();
  await testEmailValidation();
  await testAttachments();
  
  // Display summary
  console.log('\n\n===========================================');
  console.log('                Test Summary');
  console.log('===========================================');
  console.log(`  Passed: ${testResults.passed}`);
  console.log(`  Failed: ${testResults.failed}`);
  console.log(`  Total:  ${testResults.passed + testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n\nFailed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`\n- ${test}:`);
      console.log(`  ${error.message}`);
    });
  }
  
  console.log('\n===========================================\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\nFatal error running tests:', error);
  process.exit(1);
});