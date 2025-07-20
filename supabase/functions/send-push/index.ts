import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { encode as base64urlEncode } from 'https://deno.land/std@0.168.0/encoding/base64url.ts';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return base64urlEncode(new Uint8Array(buffer));
}

// Generate VAPID JWT
async function generateVAPIDAuthHeader(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: new URL(endpoint).origin,
    exp: now + (12 * 60 * 60), // 12 hours
    sub: subject
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const privateKeyData = urlBase64ToUint8Array(privateKey);
  const algorithm = {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: { name: 'SHA-256' }
  };

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    algorithm,
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    algorithm,
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${unsignedToken}.${encodedSignature}`;
}

// Encrypt the payload using Web Push encryption
async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string,
  vapidPublicKey: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: string }> {
  const userPublicKeyData = urlBase64ToUint8Array(userPublicKey);
  const userAuthData = urlBase64ToUint8Array(userAuth);
  const vapidPublicKeyData = urlBase64ToUint8Array(vapidPublicKey);

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key
  const serverPublicKeyData = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = arrayBufferToBase64Url(serverPublicKeyData);

  // Import user public key
  const userPublicCryptoKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyData,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Perform ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicCryptoKey },
    serverKeyPair.privateKey,
    256
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption keys using HKDF
  const ikm = new Uint8Array(sharedSecret);
  const info = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  
  // Simplified HKDF (in production, use proper HKDF implementation)
  const prk = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const encryptionKey = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: salt,
      info: info,
      hash: 'SHA-256'
    },
    prk,
    128
  );

  // Encrypt the payload
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const algorithm = {
    name: 'AES-GCM',
    iv: iv,
    tagLength: 128
  };

  const key = await crypto.subtle.importKey(
    'raw',
    encryptionKey,
    algorithm,
    false,
    ['encrypt']
  );

  const payloadUint8 = new TextEncoder().encode(payload);
  const encrypted = await crypto.subtle.encrypt(
    algorithm,
    key,
    payloadUint8
  );

  // Combine salt, record size, key ID length, key ID, and encrypted payload
  const output = new Uint8Array(salt.length + 4 + 1 + serverPublicKeyData.byteLength + encrypted.byteLength);
  let offset = 0;

  // Add salt
  output.set(salt, offset);
  offset += salt.length;

  // Add record size (4 bytes, big-endian)
  const recordSize = encrypted.byteLength + 16; // Include auth tag
  output[offset++] = (recordSize >> 24) & 0xff;
  output[offset++] = (recordSize >> 16) & 0xff;
  output[offset++] = (recordSize >> 8) & 0xff;
  output[offset++] = recordSize & 0xff;

  // Add key ID length
  output[offset++] = serverPublicKeyData.byteLength;

  // Add server public key
  output.set(new Uint8Array(serverPublicKeyData), offset);
  offset += serverPublicKeyData.byteLength;

  // Add encrypted payload
  output.set(new Uint8Array(encrypted), offset);

  return { encrypted: output, salt, serverPublicKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get VAPID keys from environment
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@blessedhorizon.org';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    const { subscription, notification } = await req.json();

    if (!subscription || !notification) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription or notification data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload = JSON.stringify(notification);
    
    // Generate JWT for VAPID authentication
    const jwt = await generateVAPIDAuthHeader(
      subscription.endpoint,
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Encrypt the payload
    const { encrypted } = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth,
      VAPID_PUBLIC_KEY
    );

    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 hours
      },
      body: encrypted,
    });

    if (!response.ok) {
      console.error('Push send failed:', response.status, await response.text());
      
      // Handle specific error codes
      if (response.status === 410) {
        // Subscription expired, should be removed
        return new Response(
          JSON.stringify({ 
            error: 'Subscription expired',
            statusCode: 410 
          }),
          { 
            status: 410, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`Push send failed: ${response.status}`);
    }

    // Log successful push
    console.log('Push notification sent successfully to:', subscription.endpoint);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});