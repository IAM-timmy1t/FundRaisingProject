// Generate VAPID keys for push notifications
// Run: node scripts/generate-vapid-keys.js

const crypto = require('crypto');

function generateVAPIDKeys() {
  // Generate ECDSA key pair using P-256 curve
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert to base64url format
  const publicKeyBase64 = publicKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

console.log('Generating VAPID keys for push notifications...\n');

const keys = generateVAPIDKeys();

console.log('=== VAPID Keys Generated ===\n');
console.log('Add these to your environment variables:\n');
console.log('Frontend (.env.local):');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
console.log('Supabase Edge Functions:');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:support@blessedhorizon.org\n`);
console.log('=== Keep the private key secure! ===');

// Save to file for reference
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'vapid-keys.json');
fs.writeFileSync(outputPath, JSON.stringify(keys, null, 2));
console.log(`\nKeys also saved to: ${outputPath}`);
console.log('Remember to add vapid-keys.json to .gitignore!');