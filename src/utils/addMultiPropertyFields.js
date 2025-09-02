/**
 * Add Multi-Property Client Fields to Database
 * Adds parent_company_id and client_type fields to support parent/child client relationships
 */

import { initializeDatabase } from './database.js';

const addMultiPropertyFields = async () => {
  try {
    console.log('🔧 Adding multi-property client fields to database...');
    
    const db = await initializeDatabase();
    
    // Add parent_company_id field
    console.log('📝 Adding parent_company_id field...');
    await db.execute(`
      ALTER TABLE clients 
      ADD COLUMN parent_company_id INTEGER 
      REFERENCES clients(id) ON DELETE CASCADE
    `);
    
    // Add client_type field with default value
    console.log('📝 Adding client_type field...');
    await db.execute(`
      ALTER TABLE clients 
      ADD COLUMN client_type TEXT 
      DEFAULT 'individual' 
      CHECK (client_type IN ('individual', 'parent', 'child'))
    `);
    
    // Create index for performance
    console.log('📝 Creating indexes for performance...');
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_clients_parent_company_id 
      ON clients(parent_company_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_clients_client_type 
      ON clients(client_type)
    `);
    
    console.log('✅ Multi-property client fields added successfully!');
    console.log('   - parent_company_id: INTEGER (foreign key to clients.id)');
    console.log('   - client_type: TEXT (individual/parent/child) with default "individual"');
    console.log('   - Indexes created for performance optimization');
    
    return true;
    
  } catch (error) {
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('ℹ️  Multi-property fields already exist in the database');
      return true;
    } else {
      console.error('❌ Error adding multi-property fields:', error);
      throw error;
    }
  }
};

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMultiPropertyFields()
    .then(() => {
      console.log('🎉 Database schema update complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addMultiPropertyFields };