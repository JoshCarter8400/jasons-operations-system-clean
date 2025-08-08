/**
 * Database Helper Functions
 * Handles database operations for Jason's Landscaping System
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
  console.log('🔍 Loading clients from Turso database...');
  
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);
    console.log('✅ Database client created');

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

    console.log(`✅ Retrieved ${result.rows.length} clients from database`);
    
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

    // Log sample data for verification
    console.log('📋 Sample client data:');
    if (clients.length > 0) {
      const sampleClient = clients[0];
      console.log('   First client:', {
        id: sampleClient.id,
        name: sampleClient.name,
        recurring_frequency: sampleClient.recurring_frequency,
        recurring_day: sampleClient.recurring_day,
        recurring_time: sampleClient.recurring_time,
        recurring_active: sampleClient.recurring_active,
        next_service_date: sampleClient.next_service_date
      });
    }

    // Log clients with recurring schedules
    const recurringClients = clients.filter(client => 
      client.recurring_frequency && client.recurring_frequency !== 'manual'
    );
    console.log(`📅 Clients with recurring schedules: ${recurringClients.length}`);
    
    if (recurringClients.length > 0) {
      console.log('   Recurring clients:');
      recurringClients.forEach(client => {
        console.log(`   - ${client.name}: ${client.recurring_frequency} on ${client.recurring_day} at ${client.recurring_time} (next: ${client.next_service_date})`);
      });
    }

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
  console.log(`🔄 Updating next service for client ${clientId} to ${nextServiceDate}...`);
  
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

    console.log(`✅ Updated next service for client ${clientId}`);
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
  console.log(`🔄 Updating recurring schedule for client ${clientId}...`, recurringData);
  
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

    console.log(`✅ Updated recurring schedule for client ${clientId}`);
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
  console.log('🔧 Initializing appointments table...');
  
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
    
    console.log('✅ Appointments table initialized');
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
  console.log(`🔄 Generating 2-year recurring appointments for client ${clientId}...`);
  
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
      console.log(`⚠️ Client ${client.name} does not have complete recurring schedule`);
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
    
    console.log(`✅ Generated ${appointments.length} recurring appointments for client ${client.name}`);
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
  console.log(`🔍 Getting appointments for ${date}...`);
  
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
    
    console.log(`✅ Found ${appointments.length} appointments for ${date}`);
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
  console.log('🆕 Creating new appointment...', appointmentData);
  
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
    console.log(`✅ Created appointment ${appointmentId}`);
    
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
  console.log(`🔄 Updating appointment ${appointmentId} status to ${status}...`);
  
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
    
    console.log(`✅ Updated appointment ${appointmentId} status to ${status}`);
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
  console.log(`🔄 Rescheduling appointment ${appointmentId} to ${newDate} at ${newTime}...`);
  
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
    
    console.log(`✅ Rescheduled appointment ${appointmentId}`);
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
  console.log('📅 Creating appointments from form data...', formData);
  
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
      
      console.log('✅ Created one-time appointment');
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
      
      console.log(`✅ Created ${appointments.length} recurring appointments (${formData.recurring})`);
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
 * Test function to verify database connection and client loading
 */
export async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    const clients = await getDatabaseClients();
    console.log(`✅ Test successful: Retrieved ${clients.length} clients`);
    return { success: true, clientCount: clients.length, clients };
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}