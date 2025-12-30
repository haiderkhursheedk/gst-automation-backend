const express = require('express');
const cors = require('cors');
const GSTDatabase = require('./database');
const GSTBrowserAutomation = require('./browser-automation');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new GSTDatabase();
const browserAutomation = new GSTBrowserAutomation();

setInterval(async () => {
  try {
    await browserAutomation.keepAlive();
  } catch (error) {
    console.error('Error keeping browser alive:', error.message);
  }
}, 60000);

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await browserAutomation.close();
  db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await browserAutomation.close();
  db.close();
  process.exit(0);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'GST Verification Service is running' });
});

app.post('/verify', async (req, res) => {
  const { gstin } = req.body;

  if (!gstin) {
    return res.status(400).json({
      error: 'GSTIN is required',
      message: 'Please provide a GSTIN in the request body'
    });
  }

  const gstinRegex = /^[0-9A-Z]{15}$/;
  if (!gstinRegex.test(gstin.toUpperCase())) {
    return res.status(400).json({
      error: 'Invalid GSTIN format',
      message: 'GSTIN must be 15 alphanumeric characters'
    });
  }

  const normalizedGSTIN = gstin.toUpperCase();

  try {
    console.log(`Checking cache for GSTIN: ${normalizedGSTIN}`);
    const cached = db.get(normalizedGSTIN);
    
    if (cached) {
      console.log('Returning cached result');
      return res.json({
        gstin: cached.gstin,
        legal_name: cached.legal_name,
        trade_name: cached.trade_name,
        address: cached.address,
        status: cached.status,
        verified_at: cached.verified_at,
        cached: true
      });
    }

    console.log(`GSTIN not in cache, fetching from portal...`);
    const extractedData = await browserAutomation.verifyGSTIN(normalizedGSTIN);

    const responseData = {
      gstin: normalizedGSTIN,
      legal_name: extractedData.legal_name || 'N/A',
      trade_name: extractedData.trade_name || 'N/A',
      address: extractedData.address || 'N/A',
      status: extractedData.status || 'N/A',
      verified_at: new Date().toISOString(),
      cached: false
    };

    db.save(responseData);
    console.log('Data saved to cache');

    res.json(responseData);

  } catch (error) {
    console.error('Error verifying GSTIN:', error);
    
    let statusCode = 500;
    if (error.message && error.message.includes('timeout')) {
      statusCode = 504;
    } else if (error.message && error.message.includes('Invalid')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      error: 'Verification failed',
      message: error.message || 'An error occurred while verifying the GSTIN',
      gstin: normalizedGSTIN,
      suggestion: 'Please check if the GSTIN is correct and try again. If the issue persists, the GST portal structure may have changed.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`GST Verification Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Verify endpoint: POST http://localhost:${PORT}/verify`);
  console.log('\n✨ Seamless CAPTCHA Handling:');
  console.log('   - Browser session is automatically saved and reused');
  console.log('   - Solve CAPTCHA once, then it\'s handled automatically');
  console.log('   - Session persists across requests until expiry');
  console.log('\n💡 Tip: Keep the browser window open for best experience');
});

