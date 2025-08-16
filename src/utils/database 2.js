/**
 * Database Connection Utilities for Jason's Landscaping Business System
 * Turso cloud database connection with libSQL
 * 
 * This module provides:
 * - Database connection management
 * - CRUD operations for all entities
 * - Search and filtering functions
 * - Data migration utilities
 * - Browser-compatible Turso cloud storage
 */

import { createClient as createLibSQLClient } from '@libsql/client';

// Database configuration
const DB_CONFIG = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL,
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

// Debug logging flag
const DEBUG = process.env.REACT_APP_DEBUG_DATABASE === 'true';

let db = null;

/**
 * Initialize database connection and create tables
 * @returns {Promise<Object>} Database client instance
 */
export const initializeDatabase = async () => {
  try {
    if (!db) {
      // Debug: Show environment variables
      console.log('🔍 Database Configuration Debug:');
      console.log('REACT_APP_TURSO_DATABASE_URL:', process.env.REACT_APP_TURSO_DATABASE_URL);
      console.log('REACT_APP_TURSO_AUTH_TOKEN exists:', !!process.env.REACT_APP_TURSO_AUTH_TOKEN);
      console.log('DB_CONFIG.url:', DB_CONFIG.url);
      
      // Validate configuration
      if (!DB_CONFIG.url) {
        throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
      }
      
      if (!DB_CONFIG.authToken && !DB_CONFIG.url.startsWith('file:')) {
        throw new Error('REACT_APP_TURSO_AUTH_TOKEN environment variable is required for cloud databases');
      }
      
      // Create libSQL client
      db = createLibSQLClient(DB_CONFIG);
      
      console.log('🔌 Attempting to connect to database:', DB_CONFIG.url.replace(/\/\/.*@/, '//***@'));
      
      if (DEBUG) {
        console.log('🔌 Connected to database:', DB_CONFIG.url.replace(/\/\/.*@/, '//***@'));
      }
      
      // Test the connection
      await db.execute('SELECT 1');
      
      console.log('✅ Database connection verified successfully');
      
      // Initialize schema without foreign key constraints
      await initializeSchema();
      
      if (DEBUG) {
        console.log('✅ Database connection and schema initialized');
      }
    }
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.error('DB_CONFIG:', DB_CONFIG);
    throw error;
  }
};

/**
 * Initialize database schema without foreign key constraints
 * @returns {Promise<void>}
 */
const initializeSchema = async () => {
  const schemaQueries = [
    // Business configuration table
    `CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0.075,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Service areas table
    `CREATE TABLE IF NOT EXISTS service_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_name TEXT NOT NULL UNIQUE,
      active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Service types table
    `CREATE TABLE IF NOT EXISTS service_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price_range TEXT NOT NULL,
      default_rate REAL NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Payment methods table
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method_name TEXT NOT NULL UNIQUE,
      active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Clients table WITHOUT foreign key constraints
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      service_type TEXT NOT NULL,
      services TEXT NOT NULL,
      price TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      last_service DATE,
      next_service DATE,
      created_date DATE NOT NULL,
      total_invoiced REAL DEFAULT 0.0,
      total_paid REAL DEFAULT 0.0,
      last_scheduled TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_clients_area ON clients(area)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_service_type ON clients(service_type)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)`,
    
    // Invoices table - Jason's invoice management system
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      client_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'collecting',
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax REAL NOT NULL DEFAULT 0.0,
      total REAL NOT NULL DEFAULT 0.0,
      notes TEXT DEFAULT '',
      payment_method TEXT,
      sent_date TEXT,
      paid_date TEXT,
      receipt_sent_date TEXT,
      receipt_delivery_method TEXT DEFAULT 'email',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Invoice line items table
    `CREATE TABLE IF NOT EXISTS invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1.0,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
    )`,
    
    // Invoice indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)`,
    `CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON invoice_line_items(invoice_id)`,
    
    // Trigger for auto-generating invoice numbers
    `CREATE TRIGGER IF NOT EXISTS invoice_number_trigger 
     AFTER INSERT ON invoices
     WHEN NEW.invoice_number IS NULL
     BEGIN
       UPDATE invoices 
       SET invoice_number = 'INV-' || strftime('%Y', 'now') || '-' || 
           CASE 
             WHEN LENGTH(CAST(NEW.id AS TEXT)) = 1 THEN '000' || NEW.id
             WHEN LENGTH(CAST(NEW.id AS TEXT)) = 2 THEN '00' || NEW.id  
             WHEN LENGTH(CAST(NEW.id AS TEXT)) = 3 THEN '0' || NEW.id
             ELSE CAST(NEW.id AS TEXT)
           END
       WHERE id = NEW.id;
     END`
  ];
  
  for (const query of schemaQueries) {
    await db.execute(query);
  }
  
  // Initialize default data for dropdowns
  await initializeDefaultData();
  
  if (DEBUG) {
    console.log('✅ Database schema initialized without foreign key constraints');
  }
};

/**
 * Initialize default data for dropdowns
 * @returns {Promise<void>}
 */
const initializeDefaultData = async () => {
  // Default service areas
  const defaultAreas = ['North End', 'South End', 'Downtown', 'Westside', 'Eastside'];
  for (const area of defaultAreas) {
    await db.execute(`INSERT OR IGNORE INTO service_areas (area_name) VALUES (?)`, [area]);
  }
  
  // Default service types
  const defaultServices = [
    { name: 'Lawn Mowing', price_range: '$30-60', default_rate: 45 },
    { name: 'Hedge Trimming', price_range: '$40-80', default_rate: 60 },
    { name: 'Garden Maintenance', price_range: '$50-100', default_rate: 75 },
    { name: 'Tree Services', price_range: '$100-300', default_rate: 200 },
    { name: 'Landscaping', price_range: '$200-1000', default_rate: 500 }
  ];
  for (const service of defaultServices) {
    await db.execute(`INSERT OR IGNORE INTO service_types (name, price_range, default_rate) VALUES (?, ?, ?)`, 
      [service.name, service.price_range, service.default_rate]);
  }
  
  // Default payment methods
  const defaultPayments = ['Cash', 'Check', 'E-Transfer', 'Credit Card', 'PayPal'];
  for (const method of defaultPayments) {
    await db.execute(`INSERT OR IGNORE INTO payment_methods (method_name) VALUES (?)`, [method]);
  }
  
  if (DEBUG) {
    console.log('✅ Default data initialized');
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
    const client = await initializeDatabase();
    
    if (DEBUG) {
      console.log('🔍 Executing SQL:', sql, params.length > 0 ? 'with params:' : '', params);
    }
    
    const result = await client.execute(sql, params);
    
    if (DEBUG) {
      console.log('📊 Query result:', { 
        rowsAffected: result.rowsAffected, 
        lastInsertRowidd: result.lastInsertRowid,
        rowCount: result.rows?.length || 0 
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
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
    const client = await initializeDatabase();
    const results = [];
    
    if (DEBUG) {
      console.log('🔄 Starting transaction with', queries.length, 'queries');
    }
    
    // Execute all queries in a transaction
    await client.batch(queries.map(({ sql, params = [] }) => ({ sql, args: params })));
    
    // For compatibility with existing code, return mock results
    for (let i = 0; i < queries.length; i++) {
      results.push({ changes: 1, lastInsertRowid: null });
    }
    
    if (DEBUG) {
      console.log('✅ Transaction completed successfully');
    }
    
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
    lastService = null, nextService = null, createdDate
  } = clientData;
  
  // Set created_date to current date if not provided
  const finalCreatedDate = createdDate || new Date().toISOString().split('T')[0];
  
  // Only include fields that are provided by the form
  // Let database defaults handle: total_invoiced, total_paid, last_scheduled, created_at, updated_at
  const result = await execute(`
    INSERT INTO clients (
      name, address, area, phone, email, service_type, services,
      price, payment_method, notes, status, last_service, next_service,
      created_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, address, area, phone, email || '', serviceType, services,
    price, paymentMethod, notes || '', status, lastService, nextService,
    finalCreatedDate
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
// EQUIPMENT OPERATIONS
// =============================================================================

/**
 * Get all equipment with optional filtering
 * @param {Object} filters - Optional filters (type, brand, status, condition)
 * @returns {Promise<Array>} Array of equipment objects
 */
export const getEquipment = async (filters = {}) => {
  let sql = 'SELECT * FROM equipment';
  const params = [];
  const conditions = [];
  
  if (filters.type) {
    conditions.push('equipment_type = ?');
    params.push(filters.type);
  }
  
  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }
  
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  
  if (filters.condition) {
    conditions.push('condition = ?');
    params.push(filters.condition);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY equipment_type, brand, model';
  
  const result = await execute(sql, params);
  return result.rows.map(parseEquipmentRow);
};

/**
 * Get equipment by ID
 * @param {number} id - Equipment ID
 * @returns {Promise<Object|null>} Equipment object or null
 */
export const getEquipmentById = async (id) => {
  const result = await execute('SELECT * FROM equipment WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  
  const equipment = parseEquipmentRow(result.rows[0]);
  
  // Get service history
  const serviceHistory = await execute(
    'SELECT * FROM equipment_service_history WHERE equipment_id = ? ORDER BY service_date DESC',
    [id]
  );
  
  return {
    ...equipment,
    serviceHistory: serviceHistory.rows.map(parseServiceHistoryRow)
  };
};

/**
 * Search equipment by text
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching equipment
 */
export const searchEquipment = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return await getEquipment();
  }
  
  const result = await execute(`
    SELECT e.* FROM equipment e
    JOIN equipment_fts fts ON e.id = fts.rowid
    WHERE equipment_fts MATCH ?
    ORDER BY rank, e.equipment_type, e.brand, e.model
  `, [searchTerm + '*']);
  
  return result.rows.map(parseEquipmentRow);
};

/**
 * Create new equipment
 * @param {Object} equipmentData - Equipment data object
 * @returns {Promise<Object>} Created equipment object
 */
export const createEquipment = async (equipmentData) => {
  const {
    equipmentType, brand, model, year, serialNumber, currentHours = 0,
    condition = 'Good', status = 'Active', lastServiceDate, lastServiceHours,
    nextServiceDueHours, specifications, purchaseDate, purchasePrice,
    warrantyExpires, currentLocation = 'Shop', notes = ''
  } = equipmentData;
  
  const result = await execute(`
    INSERT INTO equipment (
      equipment_type, brand, model, year, serial_number, current_hours,
      condition, status, last_service_date, last_service_hours,
      next_service_due_hours, specifications, purchase_date, purchase_price,
      warranty_expires, current_location, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    equipmentType, brand, model, year, serialNumber || null, currentHours,
    condition, status, lastServiceDate || null, lastServiceHours || null,
    nextServiceDueHours || null, specifications ? JSON.stringify(specifications) : null,
    purchaseDate || null, purchasePrice || null, warrantyExpires || null, currentLocation, notes
  ]);
  
  return await getEquipmentById(result.lastInsertRowid);
};

/**
 * Update existing equipment
 * @param {number} id - Equipment ID
 * @param {Object} equipmentData - Updated equipment data
 * @returns {Promise<Object>} Updated equipment object
 */
export const updateEquipment = async (id, equipmentData) => {
  const {
    equipmentType, brand, model, year, serialNumber, currentHours,
    condition, status, lastServiceDate, lastServiceHours,
    nextServiceDueHours, specifications, purchaseDate, purchasePrice,
    warrantyExpires, currentLocation, notes
  } = equipmentData;
  
  await execute(`
    UPDATE equipment SET
      equipment_type = ?, brand = ?, model = ?, year = ?, serial_number = ?,
      current_hours = ?, condition = ?, status = ?, last_service_date = ?,
      last_service_hours = ?, next_service_due_hours = ?, specifications = ?,
      purchase_date = ?, purchase_price = ?, warranty_expires = ?,
      current_location = ?, notes = ?
    WHERE id = ?
  `, [
    equipmentType, brand, model, year, serialNumber || null, currentHours,
    condition, status, lastServiceDate || null, lastServiceHours || null,
    nextServiceDueHours || null, specifications ? JSON.stringify(specifications) : null,
    purchaseDate || null, purchasePrice || null, warrantyExpires || null, currentLocation, notes, id
  ]);
  
  return await getEquipmentById(id);
};

/**
 * Delete equipment
 * @param {number} id - Equipment ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteEquipment = async (id) => {
  await execute('DELETE FROM equipment WHERE id = ?', [id]);
  return true;
};

/**
 * Get equipment types
 * @returns {Promise<Array>} Array of equipment types
 */
export const getEquipmentTypes = async () => {
  const result = await execute('SELECT * FROM equipment_types WHERE active = true ORDER BY type_name');
  return result.rows;
};

/**
 * Add service record to equipment
 * @param {Object} serviceData - Service record data
 * @returns {Promise<Object>} Created service record
 */
export const addEquipmentService = async (serviceData) => {
  const {
    equipmentId, serviceDate, serviceType, hoursAtService, description,
    cost = 0, performedBy = 'Jason', nextServiceDueHours, partsReplaced
  } = serviceData;
  
  const queries = [
    // Insert service record
    {
      sql: `INSERT INTO equipment_service_history (
        equipment_id, service_date, service_type, hours_at_service,
        description, cost, performed_by, next_service_due_hours, parts_replaced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        equipmentId, serviceDate, serviceType, hoursAtService, description,
        cost, performedBy, nextServiceDueHours, partsReplaced ? JSON.stringify(partsReplaced) : null
      ]
    },
    // Update equipment with latest service info
    {
      sql: `UPDATE equipment SET 
        last_service_date = ?, 
        last_service_hours = ?, 
        next_service_due_hours = ?
        WHERE id = ?`,
      params: [serviceDate, hoursAtService, nextServiceDueHours, equipmentId]
    }
  ];
  
  const results = await executeTransaction(queries);
  
  // Get the created service record
  const serviceResult = await execute(
    'SELECT * FROM equipment_service_history WHERE id = ?',
    [results[0].lastInsertRowid]
  );
  
  return parseServiceHistoryRow(serviceResult.rows[0]);
};

/**
 * Get equipment service history
 * @param {number} equipmentId - Equipment ID
 * @returns {Promise<Array>} Array of service records
 */
export const getEquipmentServiceHistory = async (equipmentId) => {
  const result = await execute(
    'SELECT * FROM equipment_service_history WHERE equipment_id = ? ORDER BY service_date DESC',
    [equipmentId]
  );
  
  return result.rows.map(parseServiceHistoryRow);
};

/**
 * Get equipment due for service
 * @returns {Promise<Array>} Array of equipment needing service
 */
export const getEquipmentDueForService = async () => {
  const result = await execute(`
    SELECT * FROM equipment 
    WHERE status = 'Active' 
    AND next_service_due_hours IS NOT NULL 
    AND current_hours >= next_service_due_hours
    ORDER BY (current_hours - next_service_due_hours) DESC
  `);
  
  return result.rows.map(parseEquipmentRow);
};

/**
 * Get equipment statistics
 * @returns {Promise<Object>} Equipment statistics
 */
export const getEquipmentStats = async () => {
  const [totalCount, activeCount, serviceCount, conditionCounts] = await Promise.all([
    execute('SELECT COUNT(*) as count FROM equipment'),
    execute('SELECT COUNT(*) as count FROM equipment WHERE status = ?', ['Active']),
    execute('SELECT COUNT(*) as count FROM equipment WHERE status = ? AND next_service_due_hours IS NOT NULL AND current_hours >= next_service_due_hours', ['Active']),
    execute('SELECT condition, COUNT(*) as count FROM equipment WHERE status = ? GROUP BY condition', ['Active'])
  ]);
  
  const conditionBreakdown = {};
  conditionCounts.rows.forEach(row => {
    conditionBreakdown[row.condition] = row.count;
  });
  
  return {
    totalEquipment: totalCount.rows[0].count,
    activeEquipment: activeCount.rows[0].count,
    needsService: serviceCount.rows[0].count,
    conditionBreakdown
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
            services: client.services || `${client.serviceType} service`,
            price: client.price || 'Price TBD',
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
 * Parse equipment row from database to match expected format
 * @param {Object} row - Database row
 * @returns {Object} Formatted equipment object
 */
const parseEquipmentRow = (row) => {
  return {
    ...row,
    specifications: row.specifications ? JSON.parse(row.specifications) : {},
    equipmentType: row.equipment_type,
    serialNumber: row.serial_number,
    currentHours: row.current_hours,
    lastServiceDate: row.last_service_date,
    lastServiceHours: row.last_service_hours,
    nextServiceDueHours: row.next_service_due_hours,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price,
    warrantyExpires: row.warranty_expires,
    currentLocation: row.current_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

/**
 * Parse service history row from database
 * @param {Object} row - Database row
 * @returns {Object} Formatted service record
 */
const parseServiceHistoryRow = (row) => {
  return {
    ...row,
    equipmentId: row.equipment_id,
    serviceDate: row.service_date,
    serviceType: row.service_type,
    hoursAtService: row.hours_at_service,
    performedBy: row.performed_by,
    nextServiceDueHours: row.next_service_due_hours,
    partsReplaced: row.parts_replaced ? JSON.parse(row.parts_replaced) : [],
    createdAt: row.created_at
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