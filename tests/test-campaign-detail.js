// Test script for Task #10 - Campaign Detail Page
// Run this in the browser console when viewing a campaign detail page

console.log('=== Testing Campaign Detail Page Features ===');

// Test 1: Check if campaign data is loaded
const campaignTitle = document.querySelector('h1')?.textContent;
console.log('✓ Campaign Title:', campaignTitle || 'NOT FOUND');

// Test 2: Check progress bar
const progressBar = document.querySelector('[role="progressbar"]');
console.log('✓ Progress Bar:', progressBar ? 'PRESENT' : 'NOT FOUND');

// Test 3: Check donation card
const donateButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.includes('Donate')
);
console.log('✓ Donate Button:', donateButton ? 'PRESENT' : 'NOT FOUND');

// Test 4: Check trust score
const trustScore = document.querySelector('[class*="trust"]');
console.log('✓ Trust Score Display:', trustScore ? 'PRESENT' : 'NOT FOUND');

// Test 5: Check updates section
const updatesSection = Array.from(document.querySelectorAll('h2, h3')).find(h => 
  h.textContent.includes('Updates')
);
console.log('✓ Updates Section:', updatesSection ? 'PRESENT' : 'NOT FOUND');

// Test 6: Check budget breakdown
const budgetSection = Array.from(document.querySelectorAll('h2, h3')).find(h => 
  h.textContent.includes('Budget')
);
console.log('✓ Budget Breakdown:', budgetSection ? 'PRESENT' : 'NOT FOUND');

// Test 7: Test donation flow
if (donateButton) {
  console.log('\n🎯 To test donation flow:');
  console.log('1. Click the Donate button');
  console.log('2. Select or enter an amount');
  console.log('3. Click "Donate Now" to proceed to payment');
  console.log('4. Use test card: 4242 4242 4242 4242');
}

console.log('\n=== Test Complete ===');
