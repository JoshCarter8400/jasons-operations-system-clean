/**
 * Database migration to add address column to business_settings table
 * This ensures existing databases have the new address field
 */

import { createClient as createLibSQLClient } from '@libsql/client';

const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL || '',
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN || ''
};

/**
 * Add address column to business_settings table if it doesn't exist
 */
export async function addAddressColumnMigration() {
  console.log('🔄 Running address column migration...');
  
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL environment variable is required');
    }

    // Create database client
    const db = createLibSQLClient(config);

    // Check if address column already exists
    const tableInfo = await db.execute(`PRAGMA table_info(business_settings)`);
    const hasAddressColumn = tableInfo.rows.some(row => row.name === 'address');

    if (hasAddressColumn) {
      console.log('✅ Address column already exists - no migration needed');
      return true;
    }

    // Add the address column
    console.log('📝 Adding address column to business_settings table...');
    await db.execute(`
      ALTER TABLE business_settings 
      ADD COLUMN address TEXT DEFAULT ''
    `);

    console.log('✅ Address column added successfully');
    
    // Verify the column was added
    const updatedTableInfo = await db.execute(`PRAGMA table_info(business_settings)`);
    const addressColumn = updatedTableInfo.rows.find(row => row.name === 'address');
    
    if (addressColumn) {
      console.log('✅ Migration verified - address column is now available');
      console.log(`   Column definition: ${addressColumn.name} ${addressColumn.type}`);
    } else {
      throw new Error('Migration verification failed - address column not found');
    }

    return true;

  } catch (error) {
    console.error('❌ Address column migration failed:', error.message);
    throw error;
  }
}

// Make function available for browser testing
if (typeof window !== 'undefined') {
  window.addAddressColumnMigration = addAddressColumnMigration;
  console.log('🔧 Address migration available: addAddressColumnMigration()');
}

export default addAddressColumnMigration;