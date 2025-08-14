import { createClient } from '@libsql/client';

class InvoiceNumberGenerator {
  constructor() {
    this.client = createClient({
      url: process.env.REACT_APP_TURSO_DATABASE_URL,
      authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
    });
  }

  /**
   * Preview the next invoice number without incrementing the counter
   * @returns {Promise<string>} Next invoice number in format INV-YYYY-NNNN
   */
  async getNextInvoiceNumber() {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get current counter for the year
      const result = await this.client.execute({
        sql: `SELECT last_number FROM invoice_counter WHERE year = ?`,
        args: [currentYear]
      });

      let nextNumber = 1;
      if (result.rows.length > 0) {
        nextNumber = result.rows[0].last_number + 1;
      }

      return `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      throw new Error('Failed to generate next invoice number');
    }
  }

  /**
   * Validate invoice number format
   * @param {string} invoiceNumber - Invoice number to validate
   * @returns {boolean} True if valid format INV-YYYY-NNNN
   */
  validateInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      return false;
    }

    // Check format: INV-YYYY-NNNN (13 characters total)
    const regex = /^INV-\d{4}-\d{4}$/;
    if (!regex.test(invoiceNumber) || invoiceNumber.length !== 13) {
      return false;
    }

    // Extract year and validate it's reasonable
    const year = parseInt(invoiceNumber.substring(4, 8));
    const currentYear = new Date().getFullYear();
    
    // Allow invoices from 2020 to 5 years in the future
    if (year < 2020 || year > currentYear + 5) {
      return false;
    }

    return true;
  }

  /**
   * Get invoice statistics for current year
   * @param {number} year - Optional year, defaults to current year
   * @returns {Promise<Object>} Statistics object with total invoices, last number, etc.
   */
  async getYearStats(year = null) {
    try {
      const targetYear = year || new Date().getFullYear();
      
      // Get counter info
      const counterResult = await this.client.execute({
        sql: `SELECT last_number, created_at, updated_at FROM invoice_counter WHERE year = ?`,
        args: [targetYear]
      });

      // Get actual invoice count for verification
      const invoiceResult = await this.client.execute({
        sql: `SELECT COUNT(*) as count FROM invoices WHERE substr(invoice_number, 5, 4) = ?`,
        args: [targetYear.toString()]
      });

      // Get status breakdown
      const statusResult = await this.client.execute({
        sql: `
          SELECT status, COUNT(*) as count 
          FROM invoices 
          WHERE substr(invoice_number, 5, 4) = ? 
          GROUP BY status
        `,
        args: [targetYear.toString()]
      });

      const stats = {
        year: targetYear,
        lastNumber: counterResult.rows.length > 0 ? counterResult.rows[0].last_number : 0,
        totalInvoices: invoiceResult.rows[0].count,
        counterCreatedAt: counterResult.rows.length > 0 ? counterResult.rows[0].created_at : null,
        counterUpdatedAt: counterResult.rows.length > 0 ? counterResult.rows[0].updated_at : null,
        statusBreakdown: {}
      };

      // Process status breakdown
      statusResult.rows.forEach(row => {
        stats.statusBreakdown[row.status] = row.count;
      });

      return stats;
    } catch (error) {
      console.error('Error getting year stats:', error);
      throw new Error('Failed to retrieve invoice statistics');
    }
  }

  /**
   * Check if an invoice number already exists
   * @param {string} invoiceNumber - Invoice number to check
   * @returns {Promise<boolean>} True if exists
   */
  async invoiceNumberExists(invoiceNumber) {
    try {
      const result = await this.client.execute({
        sql: `SELECT 1 FROM invoices WHERE invoice_number = ? LIMIT 1`,
        args: [invoiceNumber]
      });

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking invoice number existence:', error);
      throw new Error('Failed to check invoice number');
    }
  }

  /**
   * Initialize counter for a new year if it doesn't exist
   * @param {number} year - Year to initialize
   * @returns {Promise<boolean>} True if initialized or already exists
   */
  async initializeYearCounter(year) {
    try {
      const result = await this.client.execute({
        sql: `
          INSERT OR IGNORE INTO invoice_counter (year, last_number) 
          VALUES (?, 0)
        `,
        args: [year]
      });

      return true;
    } catch (error) {
      console.error('Error initializing year counter:', error);
      throw new Error('Failed to initialize year counter');
    }
  }

  /**
   * Get all years that have invoice counters
   * @returns {Promise<Array>} Array of years with invoice data
   */
  async getActiveYears() {
    try {
      const result = await this.client.execute({
        sql: `SELECT year FROM invoice_counter ORDER BY year DESC`
      });

      return result.rows.map(row => row.year);
    } catch (error) {
      console.error('Error getting active years:', error);
      throw new Error('Failed to retrieve active years');
    }
  }

  /**
   * Reset counter for a year (use with extreme caution)
   * @param {number} year - Year to reset
   * @param {number} newValue - New counter value (default 0)
   * @returns {Promise<boolean>} True if reset successful
   */
  async resetYearCounter(year, newValue = 0) {
    try {
      // Check if there are existing invoices for this year
      const invoiceCheck = await this.client.execute({
        sql: `SELECT COUNT(*) as count FROM invoices WHERE substr(invoice_number, 5, 4) = ?`,
        args: [year.toString()]
      });

      if (invoiceCheck.rows[0].count > 0 && newValue < invoiceCheck.rows[0].count) {
        throw new Error('Cannot reset counter below existing invoice count');
      }

      await this.client.execute({
        sql: `
          UPDATE invoice_counter 
          SET last_number = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE year = ?
        `,
        args: [newValue, year]
      });

      return true;
    } catch (error) {
      console.error('Error resetting year counter:', error);
      throw error;
    }
  }
}

export default InvoiceNumberGenerator;