const fs = require('fs');
const path = require('path');

class GSTDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'gst_cache.json');
    this.data = this.loadDatabase();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading database:', error.message);
    }
    return {};
  }

  saveDatabase() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving database:', error.message);
    }
  }

  get(gstin) {
    return this.data[gstin] || null;
  }

  save(data) {
    this.data[data.gstin] = {
      gstin: data.gstin,
      legal_name: data.legal_name,
      trade_name: data.trade_name,
      address: data.address,
      status: data.status,
      verified_at: data.verified_at,
      created_at: this.data[data.gstin]?.created_at || new Date().toISOString()
    };
    this.saveDatabase();
  }

  close() {
  }
}

module.exports = GSTDatabase;

