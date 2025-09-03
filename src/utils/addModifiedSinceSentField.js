/**
 * Migration to add modified_since_sent field to invoices table
 * This tracks whether a sent invoice has been modified and needs re-sending
 */

import { createClient as createLibSQLClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL,
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

async function addModifiedSinceSentField() {
  console.log('🚀 Adding modified_since_sent field to invoices table...\n');
  
  try {
    const db = createLibSQLClient(config);
    
    // Check if column already exists
    const tableInfo = await db.execute(`PRAGMA table_info(invoices)`);
    const hasColumn = tableInfo.rows.some(row => row.name === 'modified_since_sent');
    
    if (hasColumn) {
      console.log('✅ modified_since_sent column already exists');
      return;
    }
    
    // Add the column
    console.log('Adding modified_since_sent column...');
    await db.execute(`
      ALTER TABLE invoices 
      ADD COLUMN modified_since_sent BOOLEAN DEFAULT 0
    `);
    
    console.log('✅ Successfully added modified_since_sent field to invoices table');
    
  } catch (error) {
    console.error('❌ Failed to add modified_since_sent field:', error);
    process.exit(1);
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  addModifiedSinceSentField().then(() => {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  });
}

export { addModifiedSinceSentField };