# CAPTCHA Handling Guide

## How It Works

The GST verification service now handles CAPTCHAs seamlessly through **session persistence**:

### 1. **Session Persistence**
- Browser cookies and session data are saved after each successful verification
- Saved sessions are reused for subsequent requests
- Once CAPTCHA is solved, it doesn't need to be solved again until the session expires

### 2. **Automatic CAPTCHA Detection**
- The system automatically detects when a CAPTCHA is present
- It waits for you to solve it (up to 5 minutes)
- After solving, the session is saved and reused

### 3. **Seamless Experience**
- **First Request**: Browser opens, you solve CAPTCHA once
- **Subsequent Requests**: Browser reuses the saved session, no CAPTCHA needed
- **Session Expiry**: If session expires, you'll only need to solve CAPTCHA again

## How to Use

### First Time Setup
1. Start the server: `npm start`
2. Make your first verification request
3. When browser opens, solve the CAPTCHA if it appears
4. The session will be automatically saved

### Subsequent Requests
- Just make requests normally - the browser will reuse the saved session
- No CAPTCHA solving needed unless the session expires

## Session Files

- `browser-cookies.json` - Stores browser cookies for session persistence
- This file is automatically created and updated

## Troubleshooting

### CAPTCHA keeps appearing
- Delete `browser-cookies.json` to start a fresh session
- The session may have expired - solve CAPTCHA again and it will be saved

### Browser not reusing session
- Check if `browser-cookies.json` exists
- Make sure the browser window stays open (don't close it manually)
- Restart the server to reload the session

### Session expired
- GST portal sessions typically last 30-60 minutes
- After expiry, solve CAPTCHA once and it will be saved again

## Advanced: Using CAPTCHA Solving Services

For fully automated CAPTCHA solving, you can integrate services like:
- 2Captcha (https://2captcha.com)
- Anti-Captcha (https://anti-captcha.com)
- CapSolver (https://capsolver.com)

To integrate, you would need to:
1. Sign up for a service
2. Add API key to environment variables
3. Modify `browser-automation.js` to call their API when CAPTCHA is detected

Example integration point: The `waitForCaptchaToBeSolved()` method can be enhanced to automatically submit CAPTCHA to a solving service.

## Current Behavior

- ✅ Detects CAPTCHA presence
- ✅ Waits for manual solving (seamless - just solve once)
- ✅ Saves session after solving
- ✅ Reuses session for subsequent requests
- ✅ Browser stays open between requests
- ⏳ Automatic CAPTCHA solving (requires third-party service integration)

