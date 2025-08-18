/**
 * Quick test for service update functionality
 * Tests the updateServiceType function after the schema fix
 */

import { 
  addServiceType, 
  updateServiceType, 
  removeServiceType, 
  getServiceTypes 
} from './databaseHelpers.js';

/**
 * Test service update functionality
 */
export async function testServiceUpdateFunctionality() {
  console.log('🧪 Testing Service Update Functionality...');
  console.log('='.repeat(50));
  
  const testServiceName = 'Test Service Update Fix';
  let testPassed = true;
  
  try {
    // Step 1: Add test service
    console.log('📝 Step 1: Adding test service...');
    await addServiceType({
      name: testServiceName,
      priceRange: '$50-$100',
      defaultRate: 75.00
    });
    console.log('✅ Test service added successfully');
    
    // Step 2: Update the service (this was failing before the fix)
    console.log('📝 Step 2: Updating test service...');
    const updateResult = await updateServiceType(testServiceName, {
      priceRange: '$60-$120',
      defaultRate: 90.00
    });
    
    if (!updateResult) {
      throw new Error('Update function returned false');
    }
    console.log('✅ Test service updated successfully');
    
    // Step 3: Verify the update
    console.log('📝 Step 3: Verifying update...');
    const services = await getServiceTypes();
    const updatedService = services.find(s => s.name === testServiceName);
    
    if (!updatedService) {
      throw new Error('Updated service not found');
    }
    
    if (updatedService.priceRange !== '$60-$120') {
      throw new Error(`Price range not updated: expected '$60-$120', got '${updatedService.priceRange}'`);
    }
    
    if (updatedService.defaultRate !== 90.00) {
      throw new Error(`Default rate not updated: expected 90.00, got ${updatedService.defaultRate}`);
    }
    
    console.log('✅ Service update verified successfully');
    console.log(`   Updated service: ${updatedService.name}`);
    console.log(`   Price range: ${updatedService.priceRange}`);
    console.log(`   Default rate: ${updatedService.defaultRate}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    testPassed = false;
  } finally {
    // Cleanup: Remove test service
    try {
      console.log('📝 Cleanup: Removing test service...');
      await removeServiceType(testServiceName);
      console.log('✅ Test service removed');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup failed:', cleanupError.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 TEST RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(50));
  
  if (testPassed) {
    console.log('🎉 Service update functionality is working correctly!');
    console.log('The updated_at column issue has been fixed.');
  } else {
    console.log('⚠️ Service update functionality still has issues.');
  }
  
  return testPassed;
}

// Make function available globally for browser testing
if (typeof window !== 'undefined') {
  window.testServiceUpdateFunctionality = testServiceUpdateFunctionality;
  console.log('🔧 Service update test available: testServiceUpdateFunctionality()');
}

export default testServiceUpdateFunctionality;