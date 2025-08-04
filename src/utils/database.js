/**
 * Database Connection Utilities for Jason's Landscaping Business System
 * Turso (libSQL) integration with offline-first capabilities
 * 
 * This module provides:
 * - Database connection management
 * - CRUD operations for all entities
 * - Search and filtering functions
 * - Data migration utilities
 * - Offline sync management
 */

import { createClient as createLibSQLClient } from '@libsql/client';

// Database configuration
const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
  // Enable local replica for offline-first functionality
  syncUrl: process.env.REACT_APP_TURSO_SYNC_URL,
  syncInterval: 60000, // Sync every 60 seconds when online
};

// Create database client
let db = null;

/**
 * Initialize database connection
 * @returns {Promise<Object>} Database client instance
 */
export const initializeDatabase = async () => {
  try {
    if (!db) {
      db = createLibSQLClient(config);
      console.log('Database connection initialized');
    }
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Execute a single SQL query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export const execute = async (sql, params = []) => {
  try {
    const database = await initializeDatabase();
    const result = await database.execute({ sql, args: params });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Execute multiple SQL queries in a transaction
 * @param {Array} queries - Array of {sql, params} objects
 * @returns {Promise<Array>} Array of query results
 */
export const executeTransaction = async (queries) => {
  try {
    const database = await initializeDatabase();
    const results = await database.batch(
      queries.map(({ sql, params = [] }) => ({ sql, args: params }))
    );
    return results;
  } catch (error) {
    console.error('Database transaction error:', error);
    throw error;
  }
};

// =============================================================================
// BUSINESS SETTINGS OPERATIONS
// =============================================================================

/**
 * Get business settings
 * @returns {Promise<Object>} Business settings object
 */
export const getBusinessSettings = async () => {
  const result = await execute('SELECT * FROM business_settings WHERE id = 1');
  if (result.rows.length === 0) {
    return null;
  }
  
  // Get related data
  const [areas, services, paymentMethods] = await Promise.all([
    execute('SELECT area_name FROM service_areas WHERE active = true ORDER BY area_name'),
    execute('SELECT name, price_range, default_rate FROM service_types WHERE active = true ORDER BY name'),
    execute('SELECT method_name FROM payment_methods WHERE active = true ORDER BY method_name')
  ]);
  
  return {
    ...result.rows[0],
    serviceAreas: areas.rows.map(row => row.area_name),
    services: services.rows,
    paymentMethods: paymentMethods.rows.map(row => row.method_name)
  };
};

/**
 * Update business settings
 * @param {Object} settings - Business settings object
 * @returns {Promise<Object>} Updated settings
 */
export const updateBusinessSettings = async (settings) => {
  const { name, phone, email, taxRate, serviceAreas, services, paymentMethods } = settings;
  
  const queries = [
    // Update main business info
    {
      sql: `INSERT OR REPLACE INTO business_settings (id, name, phone, email, tax_rate) 
            VALUES (1, ?, ?, ?, ?)`,
      params: [name, phone, email, taxRate]
    }
  ];
  
  // Update service areas
  if (serviceAreas && serviceAreas.length > 0) {
    queries.push({ sql: 'DELETE FROM service_areas', params: [] });
    serviceAreas.forEach(area => {
      queries.push({
        sql: 'INSERT INTO service_areas (area_name) VALUES (?)',
        params: [area]
      });
    });
  }
  
  // Update services
  if (services && services.length > 0) {
    queries.push({ sql: 'DELETE FROM service_types', params: [] });
    services.forEach(service => {
      queries.push({
        sql: 'INSERT INTO service_types (name, price_range, default_rate) VALUES (?, ?, ?)',
        params: [service.name, service.priceRange, service.defaultRate]
      });
    });
  }
  
  // Update payment methods
  if (paymentMethods && paymentMethods.length > 0) {
    queries.push({ sql: 'DELETE FROM payment_methods', params: [] });
    paymentMethods.forEach(method => {
      queries.push({
        sql: 'INSERT INTO payment_methods (method_name) VALUES (?)',
        params: [method]
      });
    });
  }
  
  await executeTransaction(queries);
  return await getBusinessSettings();
};

// =============================================================================
// CLIENT OPERATIONS
// =============================================================================

/**
 * Get all clients with optional filtering
 * @param {Object} filters - Optional filters (area, serviceType, status)
 * @returns {Promise<Array>} Array of client objects
 */
export const getClients = async (filters = {}) => {
  let sql = 'SELECT * FROM clients';
  const params = [];
  const conditions = [];
  
  if (filters.area) {
    conditions.push('area = ?');
    params.push(filters.area);
  }
  
  if (filters.serviceType) {
    conditions.push('service_type = ?');
    params.push(filters.serviceType);
  }
  
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY name';
  
  const result = await execute(sql, params);
  return result.rows.map(parseClientRow);
};

/**
 * Get a single client by ID
 * @param {number} id - Client ID
 * @returns {Promise<Object|null>} Client object or null
 */
export const getClientById = async (id) => {
  const result = await execute('SELECT * FROM clients WHERE id = ?', [id]);
  return result.rows.length > 0 ? parseClientRow(result.rows[0]) : null;
};

/**
 * Search clients by text
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching clients
 */
export const searchClients = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return await getClients();
  }
  
  const result = await execute(`
    SELECT c.* FROM clients c
    JOIN clients_fts fts ON c.id = fts.rowid
    WHERE clients_fts MATCH ?
    ORDER BY rank, c.name
  `, [searchTerm + '*']);
  
  return result.rows.map(parseClientRow);
};

/**
 * Create a new client
 * @param {Object} clientData - Client data object
 * @returns {Promise<Object>} Created client object
 */
export const createClient = async (clientData) => {
  const {
    name, address, area, phone, email = '', serviceType, services,
    price, paymentMethod, notes = '', status = 'Active',
    lastService, nextService, createdDate, lastScheduled
  } = clientData;
  
  const result = await execute(`
    INSERT INTO clients (
      name, address, area, phone, email, service_type, services,
      price, payment_method, notes, status, last_service, next_service,
      created_date, last_scheduled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, address, area, phone, email, serviceType, services,
    price, paymentMethod, notes, status, lastService, nextService,
    createdDate, lastScheduled ? JSON.stringify(lastScheduled) : null
  ]);
  
  return await getClientById(result.lastInsertRowid);
};

/**
 * Update an existing client
 * @param {number} id - Client ID
 * @param {Object} clientData - Updated client data
 * @returns {Promise<Object>} Updated client object
 */
export const updateClient = async (id, clientData) => {
  const {
    name, address, area, phone, email, serviceType, services,
    price, paymentMethod, notes, status, lastService, nextService, lastScheduled
  } = clientData;
  
  await execute(`
    UPDATE clients SET
      name = ?, address = ?, area = ?, phone = ?, email = ?,
      service_type = ?, services = ?, price = ?, payment_method = ?,
      notes = ?, status = ?, last_service = ?, next_service = ?,
      last_scheduled = ?
    WHERE id = ?
  `, [
    name, address, area, phone, email, serviceType, services,
    price, paymentMethod, notes, status, lastService, nextService,
    lastScheduled ? JSON.stringify(lastScheduled) : null, id
  ]);
  
  return await getClientById(id);
};

/**
 * Delete a client
 * @param {number} id - Client ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteClient = async (id) => {
  await execute('DELETE FROM clients WHERE id = ?', [id]);
  return true;
};

// =============================================================================
// INVOICE OPERATIONS
// =============================================================================

/**
 * Get invoices with optional filtering
 * @param {Object} filters - Optional filters (clientId, status, dateRange)
 * @returns {Promise<Array>} Array of invoice objects
 */
export const getInvoices = async (filters = {}) => {
  let sql = `
    SELECT i.*, c.name as client_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
  `;
  const params = [];
  const conditions = [];
  
  if (filters.clientId) {
    conditions.push('i.client_id = ?');
    params.push(filters.clientId);
  }
  
  if (filters.status) {
    conditions.push('i.status = ?');
    params.push(filters.status);
  }
  
  if (filters.startDate && filters.endDate) {
    conditions.push('i.date BETWEEN ? AND ?');
    params.push(filters.startDate, filters.endDate);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY i.date DESC';
  
  const result = await execute(sql, params);
  
  // Get line items for each invoice
  const invoices = await Promise.all(
    result.rows.map(async (invoice) => {
      const lineItems = await execute(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY id',
        [invoice.id]
      );
      return {
        ...invoice,
        services: lineItems.rows
      };
    })
  );
  
  return invoices;
};

/**
 * Create a new invoice
 * @param {Object} invoiceData - Invoice data object
 * @returns {Promise<Object>} Created invoice object
 */
export const createInvoice = async (invoiceData) => {
  const {
    clientId, clientName, date, dueDate, status = 'Draft',
    services, subtotal, tax, total, notes = '', paymentMethod
  } = invoiceData;
  
  const queries = [
    // Insert invoice
    {
      sql: `INSERT INTO invoices (
        client_id, client_name, date, due_date, status,
        subtotal, tax, total, notes, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [clientId, clientName, date, dueDate, status, subtotal, tax, total, notes, paymentMethod]
    }
  ];
  
  // We'll need to get the invoice ID after creation to add line items
  const invoiceResult = await execute(queries[0].sql, queries[0].params);
  const invoiceId = invoiceResult.lastInsertRowid;
  
  // Insert line items
  if (services && services.length > 0) {
    const lineItemQueries = services.map(service => ({
      sql: 'INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
      params: [invoiceId, service.description, service.quantity, service.rate, service.amount]
    }));
    
    await executeTransaction(lineItemQueries);
  }
  
  return await getInvoiceById(invoiceId);
};

/**
 * Get invoice by ID
 * @param {number} id - Invoice ID
 * @returns {Promise<Object|null>} Invoice object or null
 */
export const getInvoiceById = async (id) => {
  const invoiceResult = await execute(`
    SELECT i.*, c.name as client_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [id]);
  
  if (invoiceResult.rows.length === 0) {
    return null;
  }
  
  const invoice = invoiceResult.rows[0];
  
  // Get line items
  const lineItemsResult = await execute(
    'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY id',
    [id]
  );
  
  return {
    ...invoice,
    services: lineItemsResult.rows
  };
};

// =============================================================================
// DATA MIGRATION UTILITIES
// =============================================================================

/**
 * Migrate data from localStorage structure to database
 * @param {Object} localStorageData - Data from localStorage
 * @returns {Promise<Object>} Migration results
 */
export const migrateFromLocalStorage = async (localStorageData) => {
  const results = {
    businessSettings: false,
    clients: 0,
    invoices: 0,
    errors: []
  };
  
  try {
    // Migrate business settings
    if (localStorageData.businessInfo) {
      await updateBusinessSettings({
        name: localStorageData.businessInfo.name,
        phone: localStorageData.businessInfo.phone,
        email: localStorageData.businessInfo.email,
        taxRate: localStorageData.businessInfo.taxRate,
        serviceAreas: localStorageData.businessInfo.serviceAreas,
        services: localStorageData.services,
        paymentMethods: localStorageData.paymentMethods
      });
      results.businessSettings = true;
    }
    
    // Migrate clients
    if (localStorageData.clients && Array.isArray(localStorageData.clients)) {
      for (const client of localStorageData.clients) {
        try {
          await createClient({
            name: client.name,
            address: client.address,
            area: client.area,
            phone: client.phone,
            email: client.email || '',
            serviceType: client.serviceType,
            services: client.services,
            price: client.price,
            paymentMethod: client.paymentMethod,
            notes: client.notes || '',
            status: client.status || 'Active',
            lastService: client.lastService,
            nextService: client.nextService,
            createdDate: client.createdDate,
            lastScheduled: client.lastScheduled
          });
          results.clients++;
        } catch (error) {
          results.errors.push(`Client ${client.name}: ${error.message}`);
        }
      }
    }
    
    // Migrate invoices
    if (localStorageData.invoices && Array.isArray(localStorageData.invoices)) {
      for (const invoice of localStorageData.invoices) {
        try {
          await createInvoice({
            clientId: invoice.clientId,
            clientName: invoice.clientName,
            date: invoice.date,
            dueDate: invoice.dueDate,
            status: invoice.status,
            services: invoice.services,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            notes: invoice.notes || '',
            paymentMethod: invoice.paymentMethod
          });
          results.invoices++;
        } catch (error) {
          results.errors.push(`Invoice ${invoice.id}: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    results.errors.push(`Migration error: ${error.message}`);
  }
  
  return results;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse client row from database to match expected format
 * @param {Object} row - Database row
 * @returns {Object} Formatted client object
 */
const parseClientRow = (row) => {
  return {
    ...row,
    lastScheduled: row.last_scheduled ? JSON.parse(row.last_scheduled) : null,
    // Convert snake_case to camelCase for consistency with existing code
    serviceType: row.service_type,
    paymentMethod: row.payment_method,
    lastService: row.last_service,
    nextService: row.next_service,
    createdDate: row.created_date,
    totalInvoiced: row.total_invoiced,
    totalPaid: row.total_paid
  };
};

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
export const getDatabaseStats = async () => {
  const [clientCount, invoiceCount, activeClients, totalRevenue] = await Promise.all([
    execute('SELECT COUNT(*) as count FROM clients'),
    execute('SELECT COUNT(*) as count FROM invoices'),
    execute('SELECT COUNT(*) as count FROM clients WHERE status = ?', ['Active']),
    execute('SELECT SUM(total) as total FROM invoices WHERE status = ?', ['Paid'])
  ]);
  
  return {
    totalClients: clientCount.rows[0].count,
    totalInvoices: invoiceCount.rows[0].count,
    activeClients: activeClients.rows[0].count,
    totalRevenue: totalRevenue.rows[0].total || 0
  };
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    await execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

// Export database instance for advanced usage
export { db };