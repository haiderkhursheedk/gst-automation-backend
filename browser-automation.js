const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs');
const path = require('path');

class GSTBrowserAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
    this.sessionPath = path.join(__dirname, 'browser-session');
    this.cookiesPath = path.join(__dirname, 'browser-cookies.json');
  }

  getPlatformUserAgent() {
    const platform = os.platform();
    if (platform === 'win32') {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    } else if (platform === 'linux') {
      return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    } else if (platform === 'darwin') {
      return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async initialize() {
    if (this.isInitialized && this.browser) {
      return;
    }

    console.log('Launching browser (non-headless mode)...');
    
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    let savedCookies = [];
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const cookiesData = fs.readFileSync(this.cookiesPath, 'utf8');
        savedCookies = JSON.parse(cookiesData);
        console.log(`Loaded ${savedCookies.length} saved cookies`);
      }
    } catch (error) {
      console.log('Could not load saved cookies, starting fresh session');
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: this.getPlatformUserAgent(),
      storageState: savedCookies.length > 0 ? { cookies: savedCookies } : undefined
    });

    if (savedCookies.length > 0) {
      await this.context.addCookies(savedCookies);
    }

    this.page = await this.context.newPage();
    this.isInitialized = true;
    console.log('Browser initialized successfully');
  }

  async saveCookies() {
    try {
      const cookies = await this.context.cookies();
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2), 'utf8');
      console.log(`Saved ${cookies.length} cookies for future sessions`);
    } catch (error) {
      console.error('Error saving cookies:', error.message);
    }
  }

  async waitForCaptchaToBeSolved(maxWaitTime = 300000) {
    console.log('\n🔍 Checking for CAPTCHA...');
    
    const startTime = Date.now();
    const checkInterval = 2000;
    let captchaDetected = false;
    let lastStatusTime = startTime;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const captchaSelectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="captcha"]',
          '.g-recaptcha',
          '#captcha',
          '[class*="captcha"]',
          '[id*="captcha"]',
          'div[data-sitekey]',
          '.recaptcha-checkbox',
          '[class*="recaptcha"]'
        ];

        let captchaFound = false;
        for (const selector of captchaSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                captchaFound = true;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }

        if (!captchaFound) {
          try {
            const pageText = await this.page.textContent('body').catch(() => '');
            if (pageText.toLowerCase().includes('captcha') || 
                pageText.toLowerCase().includes('verify you are human') ||
                pageText.toLowerCase().includes('i\'m not a robot')) {
              captchaFound = true;
            }
          } catch (e) {
          }
        }

        if (captchaFound && !captchaDetected) {
          captchaDetected = true;
          console.log('⚠️  CAPTCHA detected! Please solve it in the browser window.');
          console.log('💡 Once solved, the session will be saved for future requests.');
        }

        if (!captchaFound) {
          const inputSelectors = [
            'input[name="gstin"]',
            'input[id="gstin"]',
            '#gstin',
            'input[type="text"]'
          ];
          
          let canProceed = false;
          for (const selector of inputSelectors) {
            try {
              const input = await this.page.$(selector);
              if (input) {
                const isDisabled = await input.isDisabled().catch(() => true);
                const isVisible = await input.isVisible().catch(() => false);
                if (!isDisabled && isVisible) {
                  canProceed = true;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }

          if (canProceed) {
            if (captchaDetected) {
              console.log('✅ CAPTCHA solved! Session saved for future use.');
            } else {
              console.log('✅ No CAPTCHA detected. Proceeding...');
            }
            await this.saveCookies();
            return true;
          }
        }

        if (captchaDetected && Date.now() - lastStatusTime > 10000) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`⏳ Still waiting... (${elapsed}s elapsed)`);
          lastStatusTime = Date.now();
        }

        await this.page.waitForTimeout(checkInterval);
      } catch (error) {
        await this.page.waitForTimeout(checkInterval);
      }
    }

    console.log('⏱️  Timeout waiting for CAPTCHA. Proceeding anyway...');
    await this.saveCookies();
    return false;
  }

  async verifyGSTIN(gstin, retries = 3) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Verifying GSTIN: ${gstin} (Attempt ${attempt}/${retries})`);
        
        const gstSearchUrl = 'https://services.gst.gov.in/services/searchtp';
        console.log('Navigating to GST portal...');
        
        try {
          await this.page.goto(gstSearchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
          });
        } catch (navError) {
          if (attempt < retries) {
            console.log(`Navigation failed, retrying... (${navError.message})`);
            await this.page.waitForTimeout(3000);
            continue;
          }
          throw navError;
        }

        await this.page.waitForTimeout(3000);
        await this.waitForCaptchaToBeSolved();

      const inputSelectors = [
        'input[name="gstin"]',
        'input[id="gstin"]',
        'input[placeholder*="GSTIN"]',
        'input[type="text"]',
        '#gstin',
        'input.form-control',
        'input[class*="gstin"]'
      ];

      let inputFound = false;
      let inputElement = null;

      for (const selector of inputSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          inputElement = await this.page.$(selector);
          if (inputElement) {
            inputFound = true;
            console.log(`Found input field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!inputFound) {
        const path = require('path');
        const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
        await this.page.screenshot({ path: screenshotPath });
        throw new Error(`Could not find GSTIN input field. Screenshot saved as ${screenshotPath}`);
      }

      console.log('Filling GSTIN field...');
      await inputElement.fill(gstin);
      await this.page.waitForTimeout(500);

      const buttonSelectors = [
        'button[type="submit"]',
        'button:has-text("Search")',
        'button:has-text("SEARCH")',
        'input[type="submit"]',
        'button.btn-primary',
        'button[class*="search"]',
        '#search',
        '.search-btn'
      ];

      let buttonFound = false;
      for (const selector of buttonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            buttonFound = true;
            console.log(`Found button with selector: ${selector}`);
            await button.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!buttonFound) {
        console.log('Button not found, trying Enter key...');
        await inputElement.press('Enter');
      }

      console.log('Waiting for results page...');
      await this.page.waitForTimeout(3000);

      const resultIndicators = [
        'table',
        '.result',
        '#result',
        '[class*="result"]',
        '[id*="result"]',
        'div:has-text("Legal Name")',
        'div:has-text("Trade Name")'
      ];

      let resultsLoaded = false;
      for (const indicator of resultIndicators) {
        try {
          await this.page.waitForSelector(indicator, { timeout: 10000 });
          resultsLoaded = true;
          console.log(`Results detected with indicator: ${indicator}`);
          break;
        } catch (e) {
          continue;
        }
      }

      await this.page.waitForTimeout(2000);

        console.log('Extracting data from DOM...');
        const extractedData = await this.extractGSTData();

        if (!extractedData.legal_name && !extractedData.trade_name && !extractedData.address) {
          if (attempt < retries) {
            console.log('No data extracted, retrying...');
            await this.page.waitForTimeout(5000);
            continue;
          }
          throw new Error('Could not extract GST data from the portal. The page structure may have changed or the GSTIN may be invalid.');
        }

        await this.saveCookies();

        return extractedData;

      } catch (error) {
        console.error(`Error during GST verification (Attempt ${attempt}/${retries}):`, error.message);
        
        if (attempt === retries) {
          try {
            const path = require('path');
            const fs = require('fs');
            const timestamp = Date.now();
            const screenshotPath = path.join(__dirname, `error-screenshot-${timestamp}.png`);
            const htmlPath = path.join(__dirname, `error-page-${timestamp}.html`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            const html = await this.page.content();
            fs.writeFileSync(htmlPath, html);
            console.log(`Debug files saved for inspection: ${screenshotPath}, ${htmlPath}`);
          } catch (debugError) {
            console.error('Could not save debug files:', debugError.message);
          }
          throw error;
        }
        
        await this.page.waitForTimeout(5000);
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  async extractGSTData() {
    const html = await this.page.content();
    
    const data = {
      legal_name: null,
      trade_name: null,
      address: null,
      status: null
    };

    try {
      const tableData = await this.page.evaluate(() => {
        const result = {};
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().toLowerCase();
              const value = cells[1] ? cells[1].textContent.trim() : '';
              
              if ((label.includes('legal') || label.includes('business')) && 
                  (label.includes('name') || label.includes('name of'))) {
                result.legal_name = value;
              }
              if (label.includes('trade') && label.includes('name')) {
                result.trade_name = value;
              }
              if (label.includes('address') || label.includes('principal place')) {
                result.address = value;
              }
              if (label.includes('status') || label.includes('registration status')) {
                result.status = value;
              }
            }
          });
        });
        return result;
      });

      if (tableData.legal_name) data.legal_name = tableData.legal_name;
      if (tableData.trade_name) data.trade_name = tableData.trade_name;
      if (tableData.address) data.address = tableData.address;
      if (tableData.status) data.status = tableData.status;
    } catch (e) {
      console.log('Table extraction failed, trying alternative methods...');
    }

    try {
      const divData = await this.page.evaluate(() => {
        const result = {};
        const allElements = document.querySelectorAll('div, span, p, td, label, strong');
        
        allElements.forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          
          const nextSibling = el.nextElementSibling;
          const parent = el.parentElement;
          const nextText = nextSibling ? nextSibling.textContent.trim() : '';
          
          if ((text.includes('legal') || text.includes('business')) && 
              (text.includes('name') || text.includes('name of'))) {
            if (nextSibling) {
              result.legal_name = nextText || nextSibling.textContent.trim();
            } else if (parent) {
              const value = parent.textContent.replace(el.textContent, '').trim();
              if (value) result.legal_name = value;
            }
          }
          
          if (text.includes('trade') && text.includes('name')) {
            if (nextSibling) {
              result.trade_name = nextText || nextSibling.textContent.trim();
            } else if (parent) {
              const value = parent.textContent.replace(el.textContent, '').trim();
              if (value) result.trade_name = value;
            }
          }
          
          if (text.includes('address') || text.includes('principal place')) {
            if (nextSibling) {
              result.address = nextText || nextSibling.textContent.trim();
            } else if (parent) {
              const value = parent.textContent.replace(el.textContent, '').trim();
              if (value) result.address = value;
            }
          }
          
          if (text.includes('status') || text.includes('registration status')) {
            if (nextSibling) {
              result.status = nextText || nextSibling.textContent.trim();
            } else if (parent) {
              const value = parent.textContent.replace(el.textContent, '').trim();
              if (value) result.status = value;
            }
          }
        });
        
        return result;
      });

      if (!data.legal_name && divData.legal_name) data.legal_name = divData.legal_name;
      if (!data.trade_name && divData.trade_name) data.trade_name = divData.trade_name;
      if (!data.address && divData.address) data.address = divData.address;
      if (!data.status && divData.status) data.status = divData.status;
    } catch (e) {
      console.log('Div extraction failed...');
    }

    if (!data.legal_name || !data.trade_name || !data.address) {
      try {
        const pageText = await this.page.textContent('body');
        const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase();
          if (line.includes('legal name') && i + 1 < lines.length) {
            data.legal_name = lines[i + 1];
          }
          if (line.includes('trade name') && i + 1 < lines.length) {
            data.trade_name = lines[i + 1];
          }
          if (line.includes('address') && i + 1 < lines.length) {
            data.address = lines[i + 1];
          }
          if (line.includes('status') && i + 1 < lines.length) {
            data.status = lines[i + 1];
          }
        }
      } catch (e) {
        console.log('Text extraction failed...');
      }
    }

    if (!data.legal_name && !data.trade_name && !data.address) {
      const fs = require('fs');
      const path = require('path');
      const debugPath = path.join(__dirname, 'debug-page.html');
      fs.writeFileSync(debugPath, html);
      console.log(`Could not extract data. HTML saved to ${debugPath} for inspection.`);
    }

    return data;
  }

  async close() {
    if (this.browser) {
      await this.saveCookies();
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
    }
  }

  async keepAlive() {
    if (this.browser && this.isInitialized) {
      try {
        const pages = this.context.pages();
        if (pages.length === 0) {
          this.page = await this.context.newPage();
        } else {
          this.page = pages[0];
        }
      } catch (error) {
        console.log('Reinitializing browser context...');
        this.isInitialized = false;
        await this.initialize();
      }
    }
  }
}

module.exports = GSTBrowserAutomation;

