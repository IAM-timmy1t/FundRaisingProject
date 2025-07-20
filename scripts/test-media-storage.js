import { storageService } from '../src/services/storageService.js';
import { supabase } from '../src/lib/customSupabaseClient.js';

/**
 * Test script for Media Storage Configuration
 * Tests all storage buckets and operations
 */

console.log('🧪 Testing Media Storage Configuration...\n');

// Test data
const testUserId = 'test-user-123';
const testCampaignId = 'test-campaign-456';
const testUpdateId = 'test-update-789';

// Create test files
function createTestFile(name, type, sizeKB = 100) {
  const content = new Uint8Array(sizeKB * 1024);
  return new File([content], name, { type });
}

async function testStorageService() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Validate file types
  console.log('Test 1: File validation...');
  try {
    const imageFile = createTestFile('test.jpg', 'image/jpeg', 1000);
    const videoFile = createTestFile('test.mp4', 'video/mp4', 5000);
    const pdfFile = createTestFile('test.pdf', 'application/pdf', 500);
    const invalidFile = createTestFile('test.exe', 'application/exe', 100);

    // Test campaign media validation
    const imageValidation = await storageService.validateFile(
      imageFile, 
      storageService.buckets.CAMPAIGN_MEDIA
    );
    
    if (imageValidation.valid) {
      results.passed++;
      console.log('✅ Image validation passed');
    } else {
      throw new Error('Image validation failed');
    }

    // Test invalid file
    const invalidValidation = await storageService.validateFile(
      invalidFile,
      storageService.buckets.CAMPAIGN_MEDIA
    );

    if (!invalidValidation.valid) {
      results.passed++;
      console.log('✅ Invalid file rejection passed');
    } else {
      throw new Error('Invalid file was not rejected');
    }

    results.tests.push({ name: 'File Validation', status: 'passed' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'File Validation', status: 'failed', error: error.message });
    console.error('❌ File validation test failed:', error.message);
  }

  // Test 2: Filename generation
  console.log('\nTest 2: Filename generation...');
  try {
    const file = createTestFile('my photo.JPG', 'image/jpeg');
    const filename = storageService.generateFileName('test-prefix', file);
    
    if (filename.includes('test-prefix') && filename.endsWith('.jpg')) {
      results.passed++;
      console.log('✅ Filename generation passed:', filename);
      results.tests.push({ name: 'Filename Generation', status: 'passed' });
    } else {
      throw new Error('Filename format incorrect');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Filename Generation', status: 'failed', error: error.message });
    console.error('❌ Filename generation test failed:', error.message);
  }

  // Test 3: Storage bucket configuration
  console.log('\nTest 3: Storage bucket configuration...');
  try {
    const buckets = ['campaign-media', 'update-media', 'receipt-documents', 'user-avatars', 'verification-docs'];
    
    for (const bucketName of buckets) {
      // Check if bucket configuration exists
      const bucketConfig = Object.values(storageService.buckets).find(b => b.name === bucketName);
      if (!bucketConfig) {
        throw new Error(`Bucket ${bucketName} not configured`);
      }
    }
    
    results.passed++;
    console.log('✅ All storage buckets configured');
    results.tests.push({ name: 'Bucket Configuration', status: 'passed' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bucket Configuration', status: 'failed', error: error.message });
    console.error('❌ Bucket configuration test failed:', error.message);
  }

  // Test 4: File size limits
  console.log('\nTest 4: File size limits...');
  try {
    // Test oversized image
    const oversizedImage = createTestFile('large.jpg', 'image/jpeg', 60000); // 60MB
    const validation = await storageService.validateFile(
      oversizedImage,
      storageService.buckets.CAMPAIGN_MEDIA
    );

    if (!validation.valid && validation.error.includes('too large')) {
      results.passed++;
      console.log('✅ File size limit enforcement passed');
      results.tests.push({ name: 'File Size Limits', status: 'passed' });
    } else {
      throw new Error('Oversized file was not rejected');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'File Size Limits', status: 'failed', error: error.message });
    console.error('❌ File size limit test failed:', error.message);
  }

  // Test 5: Database table existence
  console.log('\nTest 5: Database tables...');
  try {
    // Check campaign_media table
    const { error: mediaError } = await supabase
      .from('campaign_media')
      .select('id')
      .limit(1);

    if (mediaError && !mediaError.message.includes('no rows')) {
      throw new Error(`campaign_media table error: ${mediaError.message}`);
    }

    // Check storage_deletion_queue table
    const { error: queueError } = await supabase
      .from('storage_deletion_queue')
      .select('id')
      .limit(1);

    if (queueError && !queueError.message.includes('no rows')) {
      throw new Error(`storage_deletion_queue table error: ${queueError.message}`);
    }

    results.passed++;
    console.log('✅ Database tables exist');
    results.tests.push({ name: 'Database Tables', status: 'passed' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Database Tables', status: 'failed', error: error.message });
    console.error('❌ Database table test failed:', error.message);
  }

  // Test 6: Storage service methods
  console.log('\nTest 6: Storage service methods...');
  try {
    const methods = [
      'uploadCampaignMedia',
      'uploadUpdateMedia', 
      'uploadReceipt',
      'uploadAvatar',
      'uploadVerificationDocument',
      'deleteMedia',
      'getSignedUrl',
      'batchUpload'
    ];

    for (const method of methods) {
      if (typeof storageService[method] !== 'function') {
        throw new Error(`Method ${method} not found`);
      }
    }

    results.passed++;
    console.log('✅ All storage service methods exist');
    results.tests.push({ name: 'Service Methods', status: 'passed' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Service Methods', status: 'failed', error: error.message });
    console.error('❌ Service methods test failed:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('\nDetailed Results:');
  results.tests.forEach(test => {
    const icon = test.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${test.name}${test.error ? `: ${test.error}` : ''}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All media storage tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.');
  }

  return results;
}

// Run tests
testStorageService().catch(console.error);
