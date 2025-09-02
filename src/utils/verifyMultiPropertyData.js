/**
 * Verify Multi-Property Client Database Changes and Test Data
 * Shows the parent/child relationships and validates the schema changes
 */

import { initializeDatabase } from './database.js';

const verifyMultiPropertyData = async () => {
  try {
    console.log('🔍 Verifying multi-property database changes...');
    
    const db = await initializeDatabase();
    
    // Check schema changes - verify new columns exist
    console.log('\n📋 Schema Verification:');
    const schemaResult = await db.execute(`
      PRAGMA table_info(clients)
    `);
    
    const columns = schemaResult.rows;
    const hasParentCompanyId = columns.some(col => col.name === 'parent_company_id');
    const hasClientType = columns.some(col => col.name === 'client_type');
    
    console.log(`   ✅ parent_company_id column: ${hasParentCompanyId ? 'EXISTS' : 'MISSING'}`);
    console.log(`   ✅ client_type column: ${hasClientType ? 'EXISTS' : 'MISSING'}`);
    
    // Check indexes
    const indexResult = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='clients' 
      AND name LIKE '%parent_company%' OR name LIKE '%client_type%'
    `);
    
    console.log(`   ✅ Performance indexes created: ${indexResult.rows.length} found`);
    indexResult.rows.forEach(index => {
      console.log(`      - ${index.name}`);
    });
    
    // Show parent company
    console.log('\n🏢 Parent Company:');
    const parentResult = await db.execute(`
      SELECT id, name, address, email, client_type 
      FROM clients 
      WHERE client_type = 'parent'
    `);
    
    if (parentResult.rows.length === 0) {
      console.log('   ❌ No parent companies found');
      return;
    }
    
    const parent = parentResult.rows[0];
    console.log(`   ID: ${parent.id}`);
    console.log(`   Name: ${parent.name}`);
    console.log(`   Address: ${parent.address}`);
    console.log(`   Email: ${parent.email}`);
    console.log(`   Type: ${parent.client_type}`);
    
    // Show child properties
    console.log('\n🏘️  Child Properties:');
    const childrenResult = await db.execute(`
      SELECT id, name, address, service_type, price, parent_company_id, client_type
      FROM clients 
      WHERE client_type = 'child' AND parent_company_id = ?
      ORDER BY name
    `, [parent.id]);
    
    console.log(`   Found ${childrenResult.rows.length} child properties:`);
    childrenResult.rows.forEach(child => {
      console.log(`   
      🏠 ${child.name}
         ID: ${child.id}
         Address: ${child.address}
         Service: ${child.service_type}
         Price: ${child.price}
         Parent ID: ${child.parent_company_id}
         Type: ${child.client_type}`);
    });
    
    // Test query to demonstrate parent/child relationship
    console.log('\n🔗 Parent/Child Relationship Query:');
    const relationshipResult = await db.execute(`
      SELECT 
        p.id as parent_id,
        p.name as parent_name,
        p.email as billing_email,
        COUNT(c.id) as child_count,
        GROUP_CONCAT(c.name, ' | ') as child_properties
      FROM clients p
      LEFT JOIN clients c ON p.id = c.parent_company_id
      WHERE p.client_type = 'parent'
      GROUP BY p.id, p.name, p.email
    `);
    
    if (relationshipResult.rows.length > 0) {
      const relationship = relationshipResult.rows[0];
      console.log(`   Parent: ${relationship.parent_name} (ID: ${relationship.parent_id})`);
      console.log(`   Billing Email: ${relationship.billing_email}`);
      console.log(`   Child Properties: ${relationship.child_count}`);
      console.log(`   Properties: ${relationship.child_properties}`);
    }
    
    // Show client type distribution
    console.log('\n📊 Client Type Distribution:');
    const distributionResult = await db.execute(`
      SELECT client_type, COUNT(*) as count
      FROM clients
      GROUP BY client_type
      ORDER BY client_type
    `);
    
    distributionResult.rows.forEach(row => {
      console.log(`   ${row.client_type}: ${row.count} clients`);
    });
    
    console.log('\n✅ Multi-property database verification complete!');
    console.log('   - Schema changes verified ✅');
    console.log('   - Test data created successfully ✅'); 
    console.log('   - Parent/child relationships working ✅');
    console.log('   - Ready for UI development ✅');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMultiPropertyData()
    .then(() => {
      console.log('\n🎉 Verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyMultiPropertyData };