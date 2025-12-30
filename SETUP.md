# Setup and Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npm run install-browsers
```

### 3. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in PORT environment variable).

## Testing the Service

### Windows (PowerShell)
```powershell
.\test-service.ps1 [GSTIN]
```

### Linux/Mac (Bash)
```bash
chmod +x test-service.sh
./test-service.sh [GSTIN]
```

### Using curl (Any Platform)
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d "{\"gstin\": \"27ABCDE1234F1Z5\"}"
```

### Using Node.js
```bash
node example-request.js [GSTIN]
```

## Cross-Platform Compatibility

This service is designed to work on both Windows and Linux:

- **File Paths**: Uses Node.js `path.join()` for cross-platform path handling
- **Database**: Uses JSON file storage (no native dependencies)
- **Browser**: Playwright handles browser installation automatically for each platform
- **User Agent**: Automatically detects OS and sets appropriate user agent

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `netstat -ano | findstr :3000` (Windows) or `lsof -i :3000` (Linux)
- Change port: `PORT=3001 npm start`

### Browser won't launch
- Make sure Playwright browsers are installed: `npm run install-browsers`
- Check if Chromium is available: `npx playwright install chromium`

### Data extraction fails
- Check `debug-screenshot.png` and `debug-page.html` files
- The GST portal structure may have changed - update selectors in `browser-automation.js`

### Cache issues
- Delete `gst_cache.json` to clear cache
- Cache file is automatically created on first verification

## File Structure

```
abdul-backend/
├── server.js              # Main HTTP server
├── browser-automation.js   # Playwright automation layer
├── database.js             # JSON-based cache
├── package.json            # Dependencies
├── test-service.ps1        # Windows test script
├── test-service.sh         # Linux/Mac test script
├── example-request.js      # Node.js test script
└── README.md              # Documentation
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## Notes

- The browser runs in **non-headless mode** - you'll see it open
- On first use, you may need to manually solve CAPTCHA or handle session cookies
- Verified GSTINs are cached in `gst_cache.json` for faster subsequent requests
- The service uses multiple extraction strategies to handle different page structures

