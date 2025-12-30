// Example script to test the GST verification service
// Run this after starting the server with: node example-request.js
// Note: Requires Node.js 18+ for built-in fetch, or install node-fetch

// For Node.js < 18, uncomment the following line:
// const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/verify';

async function testGSTVerification(gstin) {
  try {
    console.log(`\nTesting GST verification for: ${gstin}`);
    console.log('Sending request...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gstin }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Verification successful!');
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Verification failed!');
      console.log('\nError:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('\nMake sure the server is running on http://localhost:3000');
  }
}

// Test with a sample GSTIN (replace with a real one)
const testGSTIN = process.argv[2] || '27ABCDE1234F1Z5';

testGSTVerification(testGSTIN);

