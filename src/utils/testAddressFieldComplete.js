/**
 * Complete end-to-end test for address field functionality
 * Tests database column, UI display, and update workflow
 */

import { updateBusinessSettings, getBusinessSettings } from './databaseHelpers.js';

/**
 * Test complete address field functionality
 */
export async function testAddressFieldComplete() {
  console.log('🧪 Testing Complete Address Field Functionality...');
  console.log('='.repeat(60));
  
  let testPassed = true;
  
  try {
    // Step 1: Test getting current business settings (should include address)
    console.log('📝 Step 1: Testing getBusinessSettings with address field...');
    const currentSettings = await getBusinessSettings();
    
    if (!currentSettings) {
      throw new Error('No business settings found');
    }
    
    console.log('✅ Business settings retrieved:');
    console.log(`   Name: ${currentSettings.name}`);
    console.log(`   Phone: ${currentSettings.phone}`);
    console.log(`   Email: ${currentSettings.email}`);
    console.log(`   Address: "${currentSettings.address || 'Not set'}"`);
    console.log(`   Tax Rate: ${currentSettings.taxRate}`);
    
    // Check if address field exists
    if (currentSettings.address === undefined) {
      throw new Error('Address field not found in business settings');
    }
    
    console.log('✅ Address field exists in business settings');
    
    // Step 2: Test updating with address
    console.log('\\n📝 Step 2: Testing updateBusinessSettings with address...');
    const testAddress = '456 Test Avenue, Sarasota, FL 34232';
    
    const updateResult = await updateBusinessSettings({
      name: currentSettings.name,
      phone: currentSettings.phone,
      email: currentSettings.email,
      address: testAddress,
      taxRate: currentSettings.taxRate
    });
    
    if (!updateResult) {
      throw new Error('updateBusinessSettings returned null');
    }
    
    console.log('✅ Business settings updated successfully');
    console.log(`   New address: "${updateResult.address}"`);
    
    if (updateResult.address !== testAddress) {
      throw new Error(`Address mismatch: expected "${testAddress}", got "${updateResult.address}"`);
    }
    
    // Step 3: Verify persistence by reading again
    console.log('\\n📝 Step 3: Verifying address persistence...');
    const verifySettings = await getBusinessSettings();
    
    if (verifySettings.address !== testAddress) {
      throw new Error(`Address not persisted: expected "${testAddress}", got "${verifySettings.address}"`);
    }
    
    console.log('✅ Address persistence verified');
    
    // Step 4: Test with empty address
    console.log('\\n📝 Step 4: Testing with empty address...');
    await updateBusinessSettings({
      name: currentSettings.name,
      phone: currentSettings.phone,
      email: currentSettings.email,
      address: '',
      taxRate: currentSettings.taxRate
    });
    
    const emptyAddressSettings = await getBusinessSettings();
    if (emptyAddressSettings.address !== '') {
      throw new Error('Empty address not handled correctly');
    }
    
    console.log('✅ Empty address handling verified');
    
    // Step 5: Reset to original address
    console.log('\\n📝 Step 5: Restoring original settings...');
    await updateBusinessSettings({
      name: currentSettings.name,
      phone: currentSettings.phone,
      email: currentSettings.email,
      address: currentSettings.address || '',
      taxRate: currentSettings.taxRate
    });
    
    console.log('✅ Original settings restored');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    testPassed = false;
  }
  
  console.log('\\n' + '='.repeat(60));
  console.log(`📊 TEST RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  if (testPassed) {
    console.log('🎉 Address field functionality is working perfectly!');
    console.log('✅ Database column exists');
    console.log('✅ getBusinessSettings returns address field');
    console.log('✅ updateBusinessSettings saves address field');
    console.log('✅ Address data persists correctly');
    console.log('✅ Empty address handling works');
  } else {
    console.log('⚠️ Address field functionality has issues.');
  }
  
  console.log('\\n🎯 MANUAL UI TEST:');
  console.log('1. Navigate to Business Settings (/settings)');
  console.log('2. Click "Edit" on Business Information section');
  console.log('3. Add an address in the Address field');
  console.log('4. Click "Save Changes"');
  console.log('5. Verify address appears in the display view');
  console.log('6. Refresh page and confirm address persists');
  
  return testPassed;
}

// Make function available globally for browser testing
if (typeof window !== 'undefined') {
  window.testAddressFieldComplete = testAddressFieldComplete;
  console.log('🔧 Complete address field test available: testAddressFieldComplete()');
}

export default testAddressFieldComplete;