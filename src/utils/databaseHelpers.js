/**
 * Database Helper Functions
 * Handles database operations for Jason's Landscaping System
 * Includes invoice-specific operations for the collecting invoice workflow
 */

import { createClient as createLibSQLClient } from '@libsql/client';

// Database configuration
const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL,
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

/**
 * Get all clients from the Turso database
 * Returns clients in the format expected by the UI
 */
export async function getDatabaseClients() {
  
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Select all clients with all fields including new recurring schedule fields
    const result = await db.execute(`
      SELECT 
        id,
        name,
        address,
        area,
        phone,
        email,
        service_type,
        services,
        price,
        payment_method,
        notes,
        status,
        last_service,
        next_service,
        created_date,
        total_invoiced,
        total_paid,
        last_scheduled,
        created_at,
        updated_at,
        recurring_frequency,
        recurring_day,
        recurring_time,
        week_pattern,
        recurring_active,
        next_service_date
      FROM clients 
      ORDER BY name
    `);

    
    // Convert database rows to client objects
    const clients = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      area: row.area,
      phone: row.phone,
      email: row.email,
      service_type: row.service_type,
      services: row.services,
      price: row.price,
      payment_method: row.payment_method,
      notes: row.notes,
      status: row.status,
      last_service: row.last_service,
      next_service: row.next_service,
      created_date: row.created_date,
      total_invoiced: row.total_invoiced,
      total_paid: row.total_paid,
      last_scheduled: row.last_scheduled,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // New recurring schedule fields
      recurring_frequency: row.recurring_frequency,
      recurring_day: row.recurring_day,
      recurring_time: row.recurring_time,
      week_pattern: row.week_pattern,
      recurring_active: Boolean(row.recurring_active),
      next_service_date: row.next_service_date
    }));


    return clients;

  } catch (error) {
    console.error('❌ Error loading clients from database:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      url: config.url ? 'configured' : 'not configured',
      authToken: config.authToken ? 'configured' : 'not configured'
    });
    
    // Re-throw the error so calling code can handle it
    throw error;
  }
}

/**
 * Update the next_service field for a client in the database
 * @param {number} clientId - The client ID
 * @param {string} nextServiceDate - The next service date in YYYY-MM-DD format
 */
export async function updateClientNextService(clientId, nextServiceDate) {
  
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Update both next_service and next_service_date fields for consistency
    const result = await db.execute({
      sql: `UPDATE clients SET 
              next_service = ?, 
              next_service_date = ?, 
              updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [nextServiceDate, nextServiceDate, clientId]
    });

    if (result.rowsAffected === 0) {
      console.warn(`⚠️ No rows updated for client ${clientId}`);
      return { success: false, error: 'Client not found' };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error updating client next service:', error);
    console.error('   Error details:', {
      message: error.message,
      clientId,
      nextServiceDate
    });
    
    throw error;
  }
}

/**
 * Update the recurring schedule fields for a client in the database
 * @param {number} clientId - The client ID
 * @param {object} recurringData - Object containing recurring schedule fields
 * @param {string} recurringData.recurring_frequency - weekly, bi-weekly, monthly, etc.
 * @param {string} recurringData.recurring_day - Monday, Tuesday, etc.
 * @param {string} recurringData.recurring_time - 9:00 AM, etc.
 * @param {boolean} recurringData.recurring_active - true/false
 */
export async function updateClientRecurringSchedule(clientId, recurringData) {
  
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Update the client's recurring schedule fields
    const result = await db.execute({
      sql: `UPDATE clients SET 
              recurring_frequency = ?, 
              recurring_day = ?, 
              recurring_time = ?, 
              recurring_active = ?,
              updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [
        recurringData.recurring_frequency,
        recurringData.recurring_day,
        recurringData.recurring_time,
        recurringData.recurring_active ? 1 : 0,
        clientId
      ]
    });

    if (result.rowsAffected === 0) {
      console.warn(`⚠️ No rows updated for client ${clientId}`);
      return { success: false, error: 'Client not found' };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error updating client recurring schedule:', error);
    console.error('   Error details:', {
      message: error.message,
      clientId,
      recurringData
    });
    
    throw error;
  }
}

/**
 * Create appointments table if it doesn't exist
 */
export async function initializeAppointmentsTable() {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        duration_hours REAL DEFAULT 1.5,
        service_type TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )
    `);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing appointments table:', error);
    throw error;
  }
}

/**
 * Generate recurring appointments for a specific client for the next 2 years
 * @param {number} clientId - The client ID
 * @param {string} startDate - Start date in YYYY-MM-DD format (optional, defaults to today)
 */
export async function generateRecurringAppointmentsForClient(clientId, startDate = null) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    // Get client details
    const clientResult = await db.execute({
      sql: 'SELECT * FROM clients WHERE id = ?',
      args: [clientId]
    });
    
    if (clientResult.rows.length === 0) {
      throw new Error(`Client ${clientId} not found`);
    }
    
    const client = clientResult.rows[0];
    
    if (!client.recurring_frequency || !client.recurring_day || !client.recurring_time || !client.recurring_active) {
      return { success: false, error: 'Incomplete recurring schedule' };
    }
    
    // Clear existing future appointments for this client
    await db.execute({
      sql: 'DELETE FROM appointments WHERE client_id = ? AND appointment_date >= date("now")',
      args: [clientId]
    });
    
    const appointments = [];
    const today = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 2); // 2 years from now
    
    // Map day names to numbers
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDayOfWeek = dayMap[client.recurring_day];
    
    if (client.recurring_frequency === 'weekly') {
      // Generate 104 weekly appointments (2 years)
      let currentDate = new Date(today);
      const daysUntilTarget = (targetDayOfWeek - currentDate.getDay() + 7) % 7;
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);
      
      for (let i = 0; i < 104; i++) {
        if (currentDate <= endDate) {
          appointments.push({
            client_id: clientId,
            appointment_date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
            appointment_time: client.recurring_time,
            status: 'scheduled',
            service_type: client.service_type
          });
        }
        currentDate.setDate(currentDate.getDate() + 7); // Next week
      }
    } else if (client.recurring_frequency === 'bi-weekly') {
      // Generate 52 bi-weekly appointments (2 years)
      let currentDate = new Date(today);
      const daysUntilTarget = (targetDayOfWeek - currentDate.getDay() + 7) % 7;
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);
      
      for (let i = 0; i < 52; i++) {
        if (currentDate <= endDate) {
          appointments.push({
            client_id: clientId,
            appointment_date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
            appointment_time: client.recurring_time,
            status: 'scheduled',
            service_type: client.service_type
          });
        }
        currentDate.setDate(currentDate.getDate() + 14); // Every other week
      }
    } else if (client.recurring_frequency === 'monthly') {
      // Generate 24 monthly appointments (2 years, 3rd Wednesday/Thursday)
      let currentDate = new Date(today);
      currentDate.setDate(1); // Start of month
      
      for (let i = 0; i < 24; i++) {
        const thirdWeekDay = getThirdWeekDay(currentDate.getFullYear(), currentDate.getMonth(), targetDayOfWeek);
        
        if (thirdWeekDay <= endDate) {
          appointments.push({
            client_id: clientId,
            appointment_date: `${thirdWeekDay.getFullYear()}-${String(thirdWeekDay.getMonth() + 1).padStart(2, '0')}-${String(thirdWeekDay.getDate()).padStart(2, '0')}`,
            appointment_time: client.recurring_time,
            status: 'scheduled',
            service_type: client.service_type
          });
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1); // Next month
      }
    }
    
    // Insert all appointments
    for (const appointment of appointments) {
      await db.execute({
        sql: `INSERT INTO appointments (client_id, appointment_date, appointment_time, status, service_type) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [appointment.client_id, appointment.appointment_date, appointment.appointment_time, appointment.status, appointment.service_type]
      });
    }
    
    return { success: true, appointmentCount: appointments.length };
    
  } catch (error) {
    console.error('❌ Error generating recurring appointments:', error);
    throw error;
  }
}

/**
 * Helper function to calculate 3rd occurrence of a weekday in a month
 */
function getThirdWeekDay(year, month, dayOfWeek) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const offset = (dayOfWeek - firstWeekday + 7) % 7;
  return new Date(year, month, 1 + offset + 14); // +14 for third occurrence
}

/**
 * Get all appointments for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 */
export async function getAppointmentsByDate(date) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `SELECT a.*, c.name, c.address, c.area, c.phone, c.service_type as client_service_type
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.appointment_date = ?
            ORDER BY a.appointment_time`,
      args: [date]
    });
    
    const appointments = result.rows.map(row => ({
      id: row.id,
      client_id: row.client_id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: row.status,
      duration_hours: row.duration_hours,
      service_type: row.service_type || row.client_service_type,
      notes: row.notes,
      client: {
        name: row.name,
        address: row.address,
        area: row.area,
        phone: row.phone
      }
    }));
    
    return appointments;
    
  } catch (error) {
    console.error('❌ Error getting appointments by date:', error);
    throw error;
  }
}

/**
 * Create a new appointment
 * @param {object} appointmentData - Appointment data
 * @param {number} appointmentData.client_id - Client ID
 * @param {string} appointmentData.appointment_date - Date in YYYY-MM-DD format
 * @param {string} appointmentData.appointment_time - Time in HH:MM format
 * @param {number} appointmentData.duration_hours - Duration in hours
 * @param {string} appointmentData.service_type - Service type
 * @param {string} appointmentData.notes - Notes
 * @param {string} appointmentData.status - Status (defaults to 'scheduled')
 */
export async function createAppointment(appointmentData) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `INSERT INTO appointments (client_id, appointment_date, appointment_time, duration_hours, service_type, notes, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        appointmentData.client_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        appointmentData.duration_hours || 1.5,
        appointmentData.service_type,
        appointmentData.notes || '',
        appointmentData.status || 'scheduled'
      ]
    });
    
    const appointmentId = result.lastInsertRowid;
    
    return { 
      success: true, 
      appointmentId: appointmentId,
      insertedId: appointmentId
    };
    
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    throw error;
  }
}

/**
 * Update appointment status (scheduled, completed, cancelled, rescheduled)
 * @param {number} appointmentId - The appointment ID
 * @param {string} status - New status
 */
export async function updateAppointmentStatus(appointmentId, status) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: 'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [status, appointmentId]
    });
    
    if (result.rowsAffected === 0) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error updating appointment status:', error);
    throw error;
  }
}

/**
 * Reschedule an appointment to a new date and time
 * @param {number} appointmentId - The appointment ID
 * @param {string} newDate - New date in YYYY-MM-DD format
 * @param {string} newTime - New time
 */
export async function rescheduleAppointment(appointmentId, newDate, newTime) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: 'UPDATE appointments SET appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newDate, newTime, appointmentId]
    });
    
    if (result.rowsAffected === 0) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error rescheduling appointment:', error);
    throw error;
  }
}

/**
 * Create appointments based on form data - handles both one-time and recurring
 * @param {object} formData - Form data from the scheduling form
 * @param {number} formData.clientId - Client ID
 * @param {string} formData.date - Initial date in YYYY-MM-DD format
 * @param {string} formData.time - Time in HH:MM format
 * @param {number} formData.duration - Duration in hours
 * @param {string} formData.serviceType - Service type
 * @param {string} formData.notes - Notes
 * @param {string} formData.recurring - Recurring pattern (One-time, Weekly, Bi-weekly, Monthly)
 * @param {string} formData.recurringDay - Day of week for recurring (Monday, Tuesday, etc.)
 */
export async function createAppointmentsFromForm(formData) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    if (formData.recurring === 'One-time') {
      // Create single appointment
      await createAppointment({
        client_id: formData.clientId,
        appointment_date: formData.date,
        appointment_time: formData.time,
        duration_hours: parseFloat(formData.duration),
        service_type: formData.serviceType,
        notes: formData.notes,
        status: 'scheduled'
      });
      
      return { success: true, appointmentCount: 1, type: 'one-time' };
      
    } else {
      // Create recurring appointments
      const appointments = [];
      const startDate = new Date(formData.date);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 2); // 2 years
      
      // Map day names to numbers
      const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const targetDayOfWeek = dayMap[formData.recurringDay];
      
      if (formData.recurring === 'Weekly') {
        // Generate weekly appointments
        let currentDate = new Date(startDate);
        
        // Adjust to the specified day of week
        const daysUntilTarget = (targetDayOfWeek - currentDate.getDay() + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        
        for (let i = 0; i < 104 && currentDate <= endDate; i++) {
          appointments.push({
            client_id: formData.clientId,
            appointment_date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
            appointment_time: formData.time,
            duration_hours: parseFloat(formData.duration),
            service_type: formData.serviceType,
            notes: formData.notes,
            status: 'scheduled'
          });
          currentDate.setDate(currentDate.getDate() + 7); // Next week
        }
      } else if (formData.recurring === 'Bi-weekly') {
        // Generate bi-weekly appointments
        let currentDate = new Date(startDate);
        
        // Adjust to the specified day of week
        const daysUntilTarget = (targetDayOfWeek - currentDate.getDay() + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        
        for (let i = 0; i < 52 && currentDate <= endDate; i++) {
          appointments.push({
            client_id: formData.clientId,
            appointment_date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
            appointment_time: formData.time,
            duration_hours: parseFloat(formData.duration),
            service_type: formData.serviceType,
            notes: formData.notes,
            status: 'scheduled'
          });
          currentDate.setDate(currentDate.getDate() + 14); // Every other week
        }
      } else if (formData.recurring === 'Monthly') {
        // Generate monthly appointments (3rd occurrence of specified day)
        let currentDate = new Date(startDate);
        currentDate.setDate(1); // Start of month
        
        for (let i = 0; i < 24 && currentDate <= endDate; i++) {
          const thirdWeekDay = getThirdWeekDay(currentDate.getFullYear(), currentDate.getMonth(), targetDayOfWeek);
          
          if (thirdWeekDay <= endDate) {
            appointments.push({
              client_id: formData.clientId,
              appointment_date: `${thirdWeekDay.getFullYear()}-${String(thirdWeekDay.getMonth() + 1).padStart(2, '0')}-${String(thirdWeekDay.getDate()).padStart(2, '0')}`,
              appointment_time: formData.time,
              duration_hours: parseFloat(formData.duration),
              service_type: formData.serviceType,
              notes: formData.notes,
              status: 'scheduled'
            });
          }
          
          currentDate.setMonth(currentDate.getMonth() + 1); // Next month
        }
      }
      
      // Insert all appointments
      for (const appointment of appointments) {
        await createAppointment(appointment);
      }
      
      return { 
        success: true, 
        appointmentCount: appointments.length, 
        type: 'recurring',
        pattern: formData.recurring.toLowerCase()
      };
    }
    
  } catch (error) {
    console.error('❌ Error creating appointments from form:', error);
    throw error;
  }
}

/**
 * Delete a single appointment from the database
 */
export async function deleteAppointment(appointmentId) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: 'DELETE FROM appointments WHERE id = ?',
      args: [appointmentId]
    });
    
    if (result.rowsAffected === 0) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting appointment:', error);
    throw error;
  }
}

/**
 * Delete all future appointments for a client from a specified date onwards
 */
export async function deleteAllFutureAppointments(clientId, fromDate) {
  
  try {
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    const db = createLibSQLClient(config);
    
    // Delete all appointments for this client on or after the specified date
    const result = await db.execute({
      sql: 'DELETE FROM appointments WHERE client_id = ? AND appointment_date >= ?',
      args: [clientId, fromDate]
    });
    
    return { success: true, deletedCount: result.rowsAffected };
  } catch (error) {
    console.error('❌ Error deleting future appointments:', error);
    throw error;
  }
}

/**
 * Test function to verify database connection and client loading
 */
export async function testDatabaseConnection() {
  
  try {
    const clients = await getDatabaseClients();
    return { success: true, clientCount: clients.length, clients };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========================================
// INVOICE MANAGEMENT FUNCTIONS
// ========================================

/**
 * Inserts a new invoice with auto-generated invoice number
 * The database trigger will automatically generate the invoice number
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} Created invoice with generated number
 */
export async function insertInvoiceWithNumber(invoiceData) {
  try {
    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `
        INSERT INTO invoices (
          client_id, client_name, date, due_date, status, 
          subtotal, tax, total, notes, sent_date, paid_date, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        invoiceData.client_id,
        invoiceData.client_name,
        invoiceData.date,
        invoiceData.due_date,
        invoiceData.status || 'collecting',
        invoiceData.subtotal || 0.0,
        invoiceData.tax || 0.0,
        invoiceData.total || 0.0,
        invoiceData.notes || '',
        invoiceData.sent_date || null,
        invoiceData.paid_date || null,
        invoiceData.payment_method || null
      ]
    });

    // Get the created invoice with the auto-generated invoice number
    const createdInvoice = await db.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [result.lastInsertRowid]
    });

    return createdInvoice.rows[0];
  } catch (error) {
    console.error('Error inserting invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

/**
 * Updates an invoice status and related fields
 * @param {number} invoiceId - Invoice ID
 * @param {string} status - New status (collecting/sent/paid/overdue)
 * @param {Object} additionalFields - Additional fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateInvoiceStatus(invoiceId, status, additionalFields = {}) {
  try {
    const db = createLibSQLClient(config);
    
    const fields = ['status = ?'];
    const values = [status];

    // Add additional fields
    Object.entries(additionalFields).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    values.push(invoiceId);

    await db.execute({
      sql: `UPDATE invoices SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: values
    });

    return true;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw new Error('Failed to update invoice status');
  }
}

/**
 * Updates specific fields on an invoice
 * @param {number} invoiceId - Invoice ID
 * @param {Object} fields - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateInvoiceFields(invoiceId, fields) {
  try {
    const db = createLibSQLClient(config);
    
    const fieldNames = Object.keys(fields);
    const fieldValues = Object.values(fields);

    const setClause = fieldNames.map(field => `${field} = ?`).join(', ');
    
    await db.execute({
      sql: `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...fieldValues, invoiceId]
    });

    return true;
  } catch (error) {
    console.error('Error updating invoice fields:', error);
    throw new Error('Failed to update invoice fields');
  }
}

/**
 * Gets a complete invoice with line items
 * @param {number} invoiceId - Invoice ID
 * @returns {Promise<Object|null>} Invoice with line items or null
 */
export async function getInvoiceWithLineItems(invoiceId) {
  try {
    const db = createLibSQLClient(config);
    
    // Get invoice
    const invoiceResult = await db.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [invoiceId]
    });

    if (invoiceResult.rows.length === 0) {
      return null;
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const lineItemsResult = await db.execute({
      sql: `
        SELECT id, description, quantity, rate, amount, created_at 
        FROM invoice_line_items 
        WHERE invoice_id = ? 
        ORDER BY created_at
      `,
      args: [invoiceId]
    });

    return {
      ...invoice,
      line_items: lineItemsResult.rows
    };
  } catch (error) {
    console.error('Error getting invoice with line items:', error);
    throw new Error('Failed to retrieve invoice');
  }
}

/**
 * Gets an invoice by invoice number
 * @param {string} invoiceNumber - Invoice number (INV-YYYY-NNNN)
 * @returns {Promise<Object|null>} Invoice object or null
 */
export async function getInvoiceByNumber(invoiceNumber) {
  try {
    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `SELECT * FROM invoices WHERE invoice_number = ?`,
      args: [invoiceNumber]
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting invoice by number:', error);
    throw new Error('Failed to retrieve invoice by number');
  }
}

/**
 * Gets all invoices for a client
 * @param {number} clientId - Client ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of invoices
 */
export async function getClientInvoices(clientId, status = null) {
  try {
    const db = createLibSQLClient(config);
    
    let sql = `SELECT * FROM invoices WHERE client_id = ?`;
    let args = [clientId];

    if (status) {
      sql += ` AND status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY date DESC`;

    const result = await db.execute({ sql, args });
    
    return result.rows;
  } catch (error) {
    console.error('Error getting client invoices:', error);
    throw new Error('Failed to retrieve client invoices');
  }
}

/**
 * Inserts a line item for an invoice
 * @param {number} invoiceId - Invoice ID
 * @param {Object} lineItemData - Line item data
 * @returns {Promise<Object>} Created line item
 */
export async function insertInvoiceLineItem(invoiceId, lineItemData) {
  try {
    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `
        INSERT INTO invoice_line_items (invoice_id, description, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        invoiceId,
        lineItemData.description,
        lineItemData.quantity || 1.0,
        lineItemData.rate,
        lineItemData.amount
      ]
    });

    // Return the created line item
    const createdItem = await db.execute({
      sql: `SELECT * FROM invoice_line_items WHERE id = ?`,
      args: [result.lastInsertRowid]
    });

    return createdItem.rows[0];
  } catch (error) {
    console.error('Error inserting line item:', error);
    throw new Error('Failed to create line item');
  }
}

/**
 * Deletes multiple line items
 * @param {Array} lineItemIds - Array of line item IDs
 * @returns {Promise<boolean>} Success status
 */
export async function deleteInvoiceLineItems(lineItemIds) {
  try {
    if (lineItemIds.length === 0) return true;

    const db = createLibSQLClient(config);
    
    const placeholders = lineItemIds.map(() => '?').join(',');
    await db.execute({
      sql: `DELETE FROM invoice_line_items WHERE id IN (${placeholders})`,
      args: lineItemIds
    });

    return true;
  } catch (error) {
    console.error('Error deleting line items:', error);
    throw new Error('Failed to delete line items');
  }
}

/**
 * Recalculates and updates invoice totals based on line items (no tax)
 * @param {number} invoiceId - Invoice ID
 * @param {number} taxRate - Tax rate (ignored - no tax applied)
 * @returns {Promise<Object>} Updated totals
 */
export async function updateInvoiceTotals(invoiceId, taxRate = 0) {
  try {
    const db = createLibSQLClient(config);
    
    // Calculate totals from line items
    const result = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as subtotal FROM invoice_line_items WHERE invoice_id = ?`,
      args: [invoiceId]
    });

    const subtotal = result.rows[0].subtotal;
    const tax = 0; // No tax applied
    const total = subtotal; // Total equals subtotal (no tax)

    // Update invoice totals
    await db.execute({
      sql: `
        UPDATE invoices 
        SET subtotal = ?, tax = ?, total = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
      args: [subtotal, tax, total, invoiceId]
    });

    return { subtotal, tax, total };
  } catch (error) {
    console.error('Error updating invoice totals:', error);
    throw new Error('Failed to update invoice totals');
  }
}

/**
 * Gets overdue invoices (sent but not paid, past due date)
 * @returns {Promise<Array>} Array of overdue invoices
 */
export async function getOverdueInvoicesList() {
  try {
    const db = createLibSQLClient(config);
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.execute({
      sql: `
        SELECT * FROM invoices 
        WHERE status = 'sent' 
          AND due_date < ? 
        ORDER BY due_date ASC
      `,
      args: [today]
    });

    return result.rows;
  } catch (error) {
    console.error('Error getting overdue invoices:', error);
    throw new Error('Failed to retrieve overdue invoices');
  }
}

/**
 * Gets invoice statistics
 * @param {number} year - Optional year filter
 * @returns {Promise<Object>} Invoice statistics
 */
export async function getInvoiceStats(year = null) {
  try {
    const db = createLibSQLClient(config);
    const currentYear = year || new Date().getFullYear();
    
    // Get basic stats
    const statsResult = await db.execute({
      sql: `
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total_amount
        FROM invoices 
        WHERE substr(invoice_number, 5, 4) = ?
        GROUP BY status
      `,
      args: [currentYear.toString()]
    });

    // Get overall totals
    const totalResult = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(AVG(total), 0) as average_invoice_amount
        FROM invoices 
        WHERE substr(invoice_number, 5, 4) = ?
      `,
      args: [currentYear.toString()]
    });

    const stats = {
      year: currentYear,
      totalInvoices: totalResult.rows[0].total_invoices,
      totalRevenue: totalResult.rows[0].total_revenue,
      averageInvoiceAmount: totalResult.rows[0].average_invoice_amount,
      byStatus: {}
    };

    // Process by status
    statsResult.rows.forEach(row => {
      stats.byStatus[row.status] = {
        count: row.count,
        totalAmount: row.total_amount
      };
    });

    return stats;
  } catch (error) {
    console.error('Error getting invoice stats:', error);
    throw new Error('Failed to retrieve invoice statistics');
  }
}

/**
 * Gets client invoice summary (for client management page)
 * @param {number} clientId - Client ID
 * @returns {Promise<Object>} Client invoice summary
 */
export async function getClientInvoiceSummary(clientId) {
  try {
    const db = createLibSQLClient(config);
    
    const result = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'collecting' THEN 1 END) as collecting_count,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COALESCE(SUM(total), 0) as total_invoiced,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN status = 'sent' THEN total END), 0) as outstanding_amount
        FROM invoices 
        WHERE client_id = ?
      `,
      args: [clientId]
    });

    return result.rows[0];
  } catch (error) {
    console.error('Error getting client invoice summary:', error);
    throw new Error('Failed to retrieve client invoice summary');
  }
}

/**
 * Safely deletes an invoice with proper safety checks and foreign key handling
 * Only allows deletion of collecting/draft invoices, never sent/paid invoices
 * @param {number} invoiceId - Invoice ID to delete
 * @returns {Promise<Object>} Deletion result with safety info
 */
export async function deleteInvoiceSafely(invoiceId) {
  
  try {
    const db = createLibSQLClient(config);
    
    // First, get the invoice to check its status and details
    const invoiceQuery = 'SELECT id, client_name, status, total, invoice_number FROM invoices WHERE id = ?';
    const invoiceArgs = [invoiceId];
    
    const invoiceResult = await db.execute({
      sql: invoiceQuery,
      args: invoiceArgs
    });
    
    if (invoiceResult.rows.length === 0) {
      console.error(`❌ [deleteInvoiceSafely] Invoice ${invoiceId} NOT FOUND in database`);
      console.error(`❌ [deleteInvoiceSafely] This indicates a cache/database synchronization issue`);
      
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    
    const invoice = invoiceResult.rows[0];
    // Safety check: Only allow deletion of collecting/draft invoices
    const allowedStatuses = ['collecting', 'draft'];
    
    if (!allowedStatuses.includes(invoice.status)) {
      const errorMsg = `Cannot delete ${invoice.status} invoice. Only collecting/draft invoices can be deleted.`;
      throw new Error(errorMsg);
    }
    
    // Delete line items first (foreign key constraint)
    const lineItemsQuery = 'DELETE FROM invoice_line_items WHERE invoice_id = ?';
    const lineItemsArgs = [invoiceId];
    
    const deleteLineItemsResult = await db.execute({
      sql: lineItemsQuery,
      args: lineItemsArgs
    });
    
    // Then delete the invoice
    const deleteInvoiceQuery = 'DELETE FROM invoices WHERE id = ?';
    const deleteInvoiceArgs = [invoiceId];
    
    const deleteInvoiceResult = await db.execute({
      sql: deleteInvoiceQuery,
      args: deleteInvoiceArgs
    });
    
    
    if (deleteInvoiceResult.rowsAffected === 0) {
      const errorMsg = `Failed to delete invoice ${invoiceId} - no rows affected`;
      throw new Error(errorMsg);
    }
    
    
    const result = {
      success: true,
      deletedInvoice: {
        id: invoice.id,
        client_name: invoice.client_name,
        status: invoice.status,
        total: invoice.total,
        invoice_number: invoice.invoice_number
      },
      lineItemsDeleted: deleteLineItemsResult.rowsAffected
    };
    
    return result;
    
  } catch (error) {
    console.error(`❌ [deleteInvoiceSafely] Error deleting invoice ${invoiceId}:`, error);
    console.error(`❌ [deleteInvoiceSafely] Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      invoiceId: invoiceId,
      invoiceIdType: typeof invoiceId
    });
    throw error;
  }
}

/**
 * Checks if an invoice can be safely deleted
 * @param {number} invoiceId - Invoice ID to check
 * @returns {Promise<Object>} Safety check result
 */
export async function canDeleteInvoice(invoiceId) {
  
  try {
    const db = createLibSQLClient(config);
    
    // Log the exact SQL query and parameters
    const sqlQuery = 'SELECT id, client_name, status, total, invoice_number FROM invoices WHERE id = ?';
    const queryArgs = [invoiceId];
    
    const result = await db.execute({
      sql: sqlQuery,
      args: queryArgs
    });
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ [canDeleteInvoice] Invoice ${invoiceId} NOT FOUND in database`);
      console.warn(`⚠️ [canDeleteInvoice] This suggests the invoice may exist in UI cache but not in database`);
      
      return {
        canDelete: false,
        reason: 'Invoice not found',
        invoice: null
      };
    }
    
    const invoice = result.rows[0];
    const allowedStatuses = ['collecting', 'draft'];
    const canDelete = allowedStatuses.includes(invoice.status);
    
    const result_obj = {
      canDelete,
      reason: canDelete ? 'Safe to delete' : `Cannot delete ${invoice.status} invoice. Only collecting/draft invoices can be deleted.`,
      invoice: {
        id: invoice.id,
        client_name: invoice.client_name,
        status: invoice.status,
        total: invoice.total,
        invoice_number: invoice.invoice_number
      }
    };
    
    return result_obj;
    
  } catch (error) {
    console.error(`❌ [canDeleteInvoice] Error checking if invoice ${invoiceId} can be deleted:`, error);
    console.error(`❌ [canDeleteInvoice] Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      invoiceId: invoiceId,
      invoiceIdType: typeof invoiceId
    });
    
    return {
      canDelete: false,
      reason: `Error checking invoice: ${error.message}`,
      invoice: null
    };
  }
}

// ============================================================================
// BUSINESS SETTINGS CRUD OPERATIONS
// ============================================================================

/**
 * Get business settings from database
 * @returns {Promise<Object>} Business settings object
 */
export async function getBusinessSettings() {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Get business settings
    const result = await db.execute(`
      SELECT id, name, phone, email, address, tax_rate, created_at, updated_at
      FROM business_settings
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address || '',
      taxRate: row.tax_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

  } catch (error) {
    console.error('❌ Error getting business settings:', error);
    throw error;
  }
}

/**
 * Update business settings in database
 * @param {Object} settings - Business settings to update
 * @returns {Promise<Object>} Updated business settings
 */
export async function updateBusinessSettings(settings) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Update business settings
    await db.execute(`
      INSERT INTO business_settings (id, name, phone, email, address, tax_rate)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        tax_rate = excluded.tax_rate,
        updated_at = CURRENT_TIMESTAMP
    `, [settings.name, settings.phone, settings.email, settings.address || '', settings.taxRate || 0.0]);

    // Return updated settings
    return await getBusinessSettings();

  } catch (error) {
    console.error('❌ Error updating business settings:', error);
    throw error;
  }
}

// ============================================================================
// SERVICE AREAS CRUD OPERATIONS
// ============================================================================

/**
 * Get all service areas from database
 * @returns {Promise<Array<string>>} Array of service area names
 */
export async function getServiceAreas() {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Get active service areas
    const result = await db.execute(`
      SELECT area_name
      FROM service_areas
      WHERE active = true
      ORDER BY area_name
    `);

    return result.rows.map(row => row.area_name);

  } catch (error) {
    console.error('❌ Error getting service areas:', error);
    throw error;
  }
}

/**
 * Add a new service area
 * @param {string} areaName - Name of the service area
 * @returns {Promise<boolean>} Success status
 */
export async function addServiceArea(areaName) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!areaName || typeof areaName !== 'string' || areaName.trim() === '') {
      throw new Error('Service area name is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Insert new service area (ON CONFLICT will handle duplicates)
    await db.execute(`
      INSERT INTO service_areas (area_name, active)
      VALUES (?, true)
      ON CONFLICT (area_name) DO UPDATE SET
        active = true,
        created_at = COALESCE(service_areas.created_at, CURRENT_TIMESTAMP)
    `, [areaName.trim()]);

    return true;

  } catch (error) {
    console.error('❌ Error adding service area:', error);
    throw error;
  }
}

/**
 * Remove a service area (mark as inactive)
 * @param {string} areaName - Name of the service area to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removeServiceArea(areaName) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!areaName || typeof areaName !== 'string') {
      throw new Error('Service area name is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Mark service area as inactive (soft delete)
    const result = await db.execute(`
      UPDATE service_areas
      SET active = false
      WHERE area_name = ?
    `, [areaName]);

    return result.rowsAffected > 0;

  } catch (error) {
    console.error('❌ Error removing service area:', error);
    throw error;
  }
}

// ============================================================================
// SERVICE TYPES CRUD OPERATIONS
// ============================================================================

/**
 * Get all service types from database
 * @returns {Promise<Array<Object>>} Array of service type objects
 */
export async function getServiceTypes() {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Get active service types
    const result = await db.execute(`
      SELECT name, price_range, default_rate, created_at
      FROM service_types
      WHERE active = true
      ORDER BY name
    `);

    return result.rows.map(row => ({
      name: row.name,
      priceRange: row.price_range,
      defaultRate: row.default_rate,
      createdAt: row.created_at
    }));

  } catch (error) {
    console.error('❌ Error getting service types:', error);
    throw error;
  }
}

/**
 * Add a new service type
 * @param {Object} service - Service object with name, priceRange, defaultRate
 * @returns {Promise<boolean>} Success status
 */
export async function addServiceType(service) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!service || !service.name || typeof service.name !== 'string') {
      throw new Error('Service name is required');
    }
    if (!service.defaultRate || service.defaultRate <= 0) {
      throw new Error('Valid default rate is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Insert new service type
    await db.execute(`
      INSERT INTO service_types (name, price_range, default_rate, active)
      VALUES (?, ?, ?, true)
      ON CONFLICT (name) DO UPDATE SET
        price_range = excluded.price_range,
        default_rate = excluded.default_rate,
        active = true,
        created_at = COALESCE(service_types.created_at, CURRENT_TIMESTAMP)
    `, [
      service.name.trim(),
      service.priceRange || '$0-$100',
      service.defaultRate
    ]);

    return true;

  } catch (error) {
    console.error('❌ Error adding service type:', error);
    throw error;
  }
}

/**
 * Update an existing service type
 * @param {string} name - Current service name
 * @param {Object} updates - Updates to apply
 * @returns {Promise<boolean>} Success status
 */
export async function updateServiceType(name, updates) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!name || typeof name !== 'string') {
      throw new Error('Service name is required');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates object is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Build update query dynamically
    const updateFields = [];
    const params = [];

    if (updates.priceRange !== undefined) {
      updateFields.push('price_range = ?');
      params.push(updates.priceRange);
    }
    if (updates.defaultRate !== undefined) {
      updateFields.push('default_rate = ?');
      params.push(updates.defaultRate);
    }
    if (updates.name !== undefined && updates.name !== name) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }

    if (updateFields.length === 0) {
      return false; // No updates to apply
    }

    params.push(name);

    // Update service type
    const result = await db.execute(`
      UPDATE service_types
      SET ${updateFields.join(', ')}
      WHERE name = ? AND active = true
    `, params);

    return result.rowsAffected > 0;

  } catch (error) {
    console.error('❌ Error updating service type:', error);
    throw error;
  }
}

/**
 * Remove a service type (mark as inactive)
 * @param {string} name - Name of the service type to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removeServiceType(name) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!name || typeof name !== 'string') {
      throw new Error('Service name is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Mark service type as inactive (soft delete)
    const result = await db.execute(`
      UPDATE service_types
      SET active = false
      WHERE name = ?
    `, [name]);

    return result.rowsAffected > 0;

  } catch (error) {
    console.error('❌ Error removing service type:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENT METHODS CRUD OPERATIONS
// ============================================================================

/**
 * Get all payment methods from database
 * @returns {Promise<Array<string>>} Array of payment method names
 */
export async function getPaymentMethods() {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Get active payment methods
    const result = await db.execute(`
      SELECT method_name
      FROM payment_methods
      WHERE active = true
      ORDER BY method_name
    `);

    return result.rows.map(row => row.method_name);

  } catch (error) {
    console.error('❌ Error getting payment methods:', error);
    throw error;
  }
}

/**
 * Add a new payment method
 * @param {string} method - Name of the payment method
 * @returns {Promise<boolean>} Success status
 */
export async function addPaymentMethod(method) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!method || typeof method !== 'string' || method.trim() === '') {
      throw new Error('Payment method name is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Insert new payment method (ON CONFLICT will handle duplicates)
    await db.execute(`
      INSERT INTO payment_methods (method_name, active)
      VALUES (?, true)
      ON CONFLICT (method_name) DO UPDATE SET
        active = true,
        created_at = COALESCE(payment_methods.created_at, CURRENT_TIMESTAMP)
    `, [method.trim()]);

    return true;

  } catch (error) {
    console.error('❌ Error adding payment method:', error);
    throw error;
  }
}

/**
 * Remove a payment method (mark as inactive)
 * @param {string} method - Name of the payment method to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removePaymentMethod(method) {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Validate input
    if (!method || typeof method !== 'string') {
      throw new Error('Payment method name is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Mark payment method as inactive (soft delete)
    const result = await db.execute(`
      UPDATE payment_methods
      SET active = false
      WHERE method_name = ?
    `, [method]);

    return result.rowsAffected > 0;

  } catch (error) {
    console.error('❌ Error removing payment method:', error);
    throw error;
  }
}

// ============================================================================
// COMBINED BUSINESS SETTINGS OPERATIONS
// ============================================================================

/**
 * Get all business settings data (business info + areas + services + payment methods)
 * @returns {Promise<Object>} Complete business settings object
 */
export async function getAllBusinessSettingsData() {
  try {
    const [businessInfo, serviceAreas, services, paymentMethods] = await Promise.all([
      getBusinessSettings(),
      getServiceAreas(),
      getServiceTypes(),
      getPaymentMethods()
    ]);

    return {
      businessInfo: businessInfo ? {
        ...businessInfo,
        serviceAreas // Add service areas to business info for compatibility
      } : null,
      services,
      paymentMethods,
      serviceAreas
    };

  } catch (error) {
    console.error('❌ Error getting all business settings data:', error);
    throw error;
  }
}

// Make functions available globally for production migration tool
if (typeof window !== 'undefined') {
  window.getAllBusinessSettingsData = getAllBusinessSettingsData;
  window.testDatabaseConnection = async () => {
    try {
      const { testConnection } = await import('./database.js');
      return await testConnection();
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  console.log('🔧 Database helper functions available globally');
}