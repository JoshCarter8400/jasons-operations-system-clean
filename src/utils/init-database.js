/**
 * Database Initialization Script
 * Sets up the database schema for Jason's Landscaping System
 * Run this once to create all tables and indexes
 */

import { createClient as createLibSQLClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration for database initialization
const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL,
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

// Validate required environment variables
if (!config.url) {
  console.error('❌ REACT_APP_TURSO_DATABASE_URL environment variable is required');
  console.error('Current environment variables:');
  console.error('REACT_APP_TURSO_DATABASE_URL:', process.env.REACT_APP_TURSO_DATABASE_URL);
  console.error('REACT_APP_TURSO_AUTH_TOKEN exists:', !!process.env.REACT_APP_TURSO_AUTH_TOKEN);
  process.exit(1);
}

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
    const schemaPath = path.join(
      process.cwd(),
      'src',
      'utils',
      'database-schema.sql'
    );
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements, handling multi-line triggers
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;

    const lines = schema.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }

      currentStatement += line + '\n';

      // Check if we're starting a trigger
      if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
        inTrigger = true;
      }

      // Check if we're ending a statement
      if (trimmedLine.endsWith(';')) {
        if (inTrigger && trimmedLine === 'END;') {
          // End of trigger
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inTrigger) {
          // Regular statement end
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // Filter out empty statements
    const validStatements = statements.filter((stmt) => stmt.length > 0);

    console.log(
      `📄 Found ${validStatements.length} SQL statements to execute\n`
    );

    // Execute each statement
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
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
    console.log(
      '   🗃️  Tables: business_settings, service_areas, service_types, payment_methods'
    );
    console.log('   🗃️  Tables: clients, invoices, invoice_line_items');
    console.log(
      '   🔧 Equipment: equipment_types, equipment, equipment_service_history'
    );
    console.log(
      '   📊 Indexes: Multiple performance indexes for mobile queries'
    );
    console.log(
      '   🔍 FTS: Full-text search tables for client and equipment lookup'
    );
    console.log(
      '   ⚡ Triggers: Auto-update triggers for calculated fields and FTS'
    );
    console.log('\n✅ Database is ready for use!');

    // Test the connection
    console.log('\n🔍 Testing database connection...');
    const testResult = await db.execute('SELECT 1 as test');
    console.log(
      `✅ Connection test: ${
        testResult.rows[0].test === 1 ? 'SUCCESS' : 'FAILED'
      }`
    );
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Populate Jason's equipment data
 */
async function populateJasonsEquipment() {
  console.log('🔧 Loading Jason\'s equipment data...\n');
  
  try {
    const db = createLibSQLClient(config);
    
    // Jason's equipment data
    const equipment = [
      {
        equipment_type: 'Mower',
        brand: 'Exmark',
        model: '2024',
        year: 2024,
        current_hours: 120.0,
        condition: 'Excellent',
        status: 'Active'
      },
      {
        equipment_type: 'Mower',
        brand: 'Honda',
        model: 'Push',
        year: 2023,
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      },
      {
        equipment_type: 'Trimmer',
        brand: 'Echo',
        model: 'SRM225',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      },
      {
        equipment_type: 'Trimmer',
        brand: 'Echo',
        model: 'SRM2620',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      },
      {
        equipment_type: 'Trimmer',
        brand: 'Echo',
        model: 'SRM',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active',
        notes: '3rd unit - model unspecified'
      },
      {
        equipment_type: 'Blower',
        brand: 'Echo',
        model: 'PB580T',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      },
      {
        equipment_type: 'Chainsaw',
        brand: 'Echo',
        model: '590',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active',
        specifications: JSON.stringify({ barSize: '20"' }),
        notes: 'Chainsaw #1'
      },
      {
        equipment_type: 'Chainsaw',
        brand: 'Echo',
        model: '590',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active',
        specifications: JSON.stringify({ barSize: '20"' }),
        notes: 'Chainsaw #2'
      },
      {
        equipment_type: 'Pole Saw',
        brand: 'Stihl',
        model: 'Pole Saw',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      },
      {
        equipment_type: 'Pressure Washer',
        brand: 'Ryobi',
        model: 'Pressure Washer',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active',
        specifications: JSON.stringify({ psi: 3000 })
      },
      {
        equipment_type: 'Trailer',
        brand: 'Big Tex',
        model: 'Trailer',
        current_hours: 0.0,
        condition: 'Good',
        status: 'Active'
      }
    ];

    console.log(`📦 Inserting ${equipment.length} pieces of equipment...\n`);

    // Insert each piece of equipment
    for (const item of equipment) {
      const result = await db.execute({
        sql: `INSERT INTO equipment (
          equipment_type, brand, model, year, current_hours, 
          condition, status, specifications, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.equipment_type,
          item.brand,
          item.model,
          item.year || null,
          item.current_hours,
          item.condition,
          item.status,
          item.specifications || null,
          item.notes || ''
        ]
      });

      console.log(`   ✅ Added: ${item.brand} ${item.model} (${item.equipment_type})`);
    }

    console.log('\n🎉 Jason\'s equipment data loaded successfully!');
    console.log(`📊 Total equipment pieces: ${equipment.length}`);
    
    // Verify the data was inserted
    const countResult = await db.execute('SELECT COUNT(*) as count FROM equipment');
    console.log(`✅ Database verification: ${countResult.rows[0].count} equipment records found`);
    
  } catch (error) {
    console.error('❌ Error loading equipment data:', error);
    throw error;
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
    console.log('⏭️  Skipping schema initialization - database already exists.');
    console.log('🔧 Loading Jason\'s equipment data...');
    await populateJasonsEquipment();
    return;
  }
  
  await initializeDatabase();
  await populateJasonsEquipment();
}

// Export for use as module
export { initializeDatabase, checkExistingTables, populateJasonsEquipment };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}