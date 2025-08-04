/**
 * Database Initialization Script
 * Sets up the database schema for Jason's Landscaping System
 * Run this once to create all tables and indexes
 */

import { createClient as createLibSQLClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Configuration for database initialization
const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

/**
 * Initialize database with schema
 */
async function initializeDatabase() {
  console.log('🚀 Initializing database schema...\n');
  
  try {
    // Create database client
    const db = createLibSQLClient(config);
    console.log('✅ Database client created');
    
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src', 'utils', 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await db.execute(statement);
        
        // Log table creation
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (\w+)/i)?.[1];
          console.log(`   ✅ Created table: ${tableName}`);
        }
        // Log index creation
        else if (statement.toUpperCase().includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX (\w+)/i)?.[1];
          console.log(`   📊 Created index: ${indexName}`);
        }
        // Log FTS table creation
        else if (statement.toUpperCase().includes('CREATE VIRTUAL TABLE')) {
          const tableName = statement.match(/CREATE VIRTUAL TABLE (\w+)/i)?.[1];
          console.log(`   🔍 Created FTS table: ${tableName}`);
        }
        // Log trigger creation
        else if (statement.toUpperCase().includes('CREATE TRIGGER')) {
          const triggerName = statement.match(/CREATE TRIGGER (\w+)/i)?.[1];
          console.log(`   ⚡ Created trigger: ${triggerName}`);
        }
        
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error(`Statement: ${statement.substring(0, 100)}...`);
      }
    }
    
    console.log('\n🎉 Database schema initialization completed!');
    console.log('\n📋 Created Objects:');
    console.log('   🗃️  Tables: business_settings, service_areas, service_types, payment_methods');
    console.log('   🗃️  Tables: clients, invoices, invoice_line_items');
    console.log('   📊 Indexes: Multiple performance indexes for mobile queries');
    console.log('   🔍 FTS: Full-text search table for client lookup');
    console.log('   ⚡ Triggers: Auto-update triggers for calculated fields');
    console.log('\n✅ Database is ready for use!');
    
    // Test the connection
    console.log('\n🔍 Testing database connection...');
    const testResult = await db.execute('SELECT 1 as test');
    console.log(`✅ Connection test: ${testResult.rows[0].test === 1 ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Check if tables already exist
 */
async function checkExistingTables() {
  try {
    const db = createLibSQLClient(config);
    const result = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    if (result.rows.length > 0) {
      console.log('⚠️  Existing tables found:');
      result.rows.forEach(row => console.log(`   - ${row.name}`));
      console.log('\n❓ Database appears to already be initialized.');
      console.log('   To reinitialize, delete the database file and run this script again.\n');
      return true;
    }
    
    return false;
  } catch (error) {
    // Database doesn't exist yet, which is fine
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏗️  Jason\'s Landscaping Database Initialization\n');
  console.log(`📂 Database URL: ${config.url}`);
  console.log(`🔐 Auth Token: ${config.authToken ? 'Configured' : 'Not set (using local file)'}\n`);
  
  const hasExistingTables = await checkExistingTables();
  
  if (hasExistingTables) {
    console.log('⏭️  Skipping initialization - database already exists.');
    return;
  }
  
  await initializeDatabase();
}

// Export for use as module
export { initializeDatabase, checkExistingTables };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}