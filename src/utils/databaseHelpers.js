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