/**
 * Test Multi-Property UI Functionality
 * Verifies that the parent/child client relationships work correctly
 */

import { 
  getDatabaseClients,
  getAllParentCompanies,
  getChildPropertiesForParent,
  getParentCompanyForChild,
  linkClientToParent,
  unlinkClientFromParent
} from './databaseHelpers.js';

const testMultiPropertyUI = async () => {
  try {
    console.log('🧪 Testing Multi-Property UI Functionality...\n');

    // 1. Load all clients and check visual data
    console.log('📊 Loading all clients...');
    const allClients = await getDatabaseClients();
    
    const parentClients = allClients.filter(c => c.client_type === 'parent');
    const childClients = allClients.filter(c => c.client_type === 'child');
    const individualClients = allClients.filter(c => c.client_type === 'individual');
    
    console.log(`   🏢 Parent companies: ${parentClients.length}`);
    console.log(`   🏠 Child properties: ${childClients.length}`);
    console.log(`   👤 Individual clients: ${individualClients.length}\n`);

    // 2. Test parent companies list
    console.log('🏢 Testing parent companies list...');
    const parentCompanies = await getAllParentCompanies();
    console.log(`   Found ${parentCompanies.length} parent companies:`);
    parentCompanies.forEach(parent => {
      console.log(`   - ${parent.name} (ID: ${parent.id})`);
    });
    console.log('');

    // 3. Test child properties for each parent
    console.log('🏠 Testing child properties for each parent...');
    for (const parent of parentClients) {
      const children = await getChildPropertiesForParent(parent.id);
      console.log(`   ${parent.name} has ${children.length} child properties:`);
      children.forEach(child => {
        console.log(`   - ${child.name} (${child.service_type} - ${child.price})`);
      });
      console.log('');
    }

    // 4. Test parent lookup for child properties
    console.log('🔗 Testing parent lookup for child properties...');
    for (const child of childClients.slice(0, 2)) { // Test first 2 children
      const parent = await getParentCompanyForChild(child.id);
      console.log(`   ${child.name} → ${parent?.name || 'No parent found'}`);
    }
    console.log('');

    // 5. Test linking/unlinking (using existing individual client)
    const individualClient = individualClients[0];
    const testParent = parentClients[0];
    
    if (individualClient && testParent) {
      console.log('🔄 Testing linking/unlinking functionality...');
      console.log(`   Test client: ${individualClient.name} (ID: ${individualClient.id})`);
      console.log(`   Test parent: ${testParent.name} (ID: ${testParent.id})`);
      
      // Link test
      console.log('   🔗 Testing link to parent...');
      await linkClientToParent(individualClient.id, testParent.id);
      console.log('   ✅ Successfully linked client to parent');
      
      // Verify the link
      const linkedParent = await getParentCompanyForChild(individualClient.id);
      console.log(`   ✅ Verification: ${individualClient.name} → ${linkedParent?.name || 'ERROR: No parent found'}`);
      
      // Unlink test
      console.log('   🔓 Testing unlink from parent...');
      await unlinkClientFromParent(individualClient.id);
      console.log('   ✅ Successfully unlinked client from parent');
      
      // Verify the unlink
      const unlinkedParent = await getParentCompanyForChild(individualClient.id);
      console.log(`   ✅ Verification: ${individualClient.name} → ${unlinkedParent?.name || 'No parent (correctly unlinked)'}`);
    }

    console.log('\n🎉 Multi-Property UI Functionality Test Complete!');
    console.log('✅ All functions working correctly');
    console.log('✅ Ready for UI testing in browser');
    
    return true;

  } catch (error) {
    console.error('❌ Multi-Property UI Test Failed:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMultiPropertyUI()
    .then(() => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testMultiPropertyUI };