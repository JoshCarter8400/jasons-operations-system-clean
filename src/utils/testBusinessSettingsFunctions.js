/**
 * Test Business Settings Database Functions
 * 
 * This utility tests all the business settings CRUD functions to ensure they work correctly.
 * Run in browser console to test the functions.
 */

import {
  getBusinessSettings,
  updateBusinessSettings,
  getServiceAreas,
  addServiceArea,
  removeServiceArea,
  getServiceTypes,
  addServiceType,
  updateServiceType,
  removeServiceType,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  getAllBusinessSettingsData
} from './databaseHelpers';

/**
 * Test all business settings functions
 */
export async function testAllBusinessSettingsFunctions() {
  console.log('🧪 Starting Business Settings Database Functions Test...');
  
  const results = {
    businessSettings: { passed: 0, failed: 0, errors: [] },
    serviceAreas: { passed: 0, failed: 0, errors: [] },
    serviceTypes: { passed: 0, failed: 0, errors: [] },
    paymentMethods: { passed: 0, failed: 0, errors: [] },
    combined: { passed: 0, failed: 0, errors: [] }
  };
  
  // Test Business Settings CRUD
  try {
    console.log('\n📝 Testing Business Settings CRUD...');
    
    // Test get (should return null initially)
    const initialSettings = await getBusinessSettings();
    console.log('✓ Get business settings (initial):', initialSettings);
    results.businessSettings.passed++;
    
    // Test update/insert
    const testSettings = {
      name: 'Test Business',
      phone: '123-456-7890',
      email: 'test@business.com',
      taxRate: 0.08
    };
    const updatedSettings = await updateBusinessSettings(testSettings);
    console.log('✓ Update business settings:', updatedSettings);
    results.businessSettings.passed++;
    
    // Test get after update
    const retrievedSettings = await getBusinessSettings();
    console.log('✓ Get business settings (after update):', retrievedSettings);
    results.businessSettings.passed++;
    
  } catch (error) {
    console.error('❌ Business Settings test error:', error);
    results.businessSettings.failed++;
    results.businessSettings.errors.push(error.message);
  }
  
  // Test Service Areas CRUD
  try {
    console.log('\n🗺️ Testing Service Areas CRUD...');
    
    // Test get (should return empty array initially)
    const initialAreas = await getServiceAreas();
    console.log('✓ Get service areas (initial):', initialAreas);
    results.serviceAreas.passed++;
    
    // Test add
    await addServiceArea('Test Area 1');
    await addServiceArea('Test Area 2');
    console.log('✓ Add service areas');
    results.serviceAreas.passed++;
    
    // Test get after add
    const areasAfterAdd = await getServiceAreas();
    console.log('✓ Get service areas (after add):', areasAfterAdd);
    results.serviceAreas.passed++;
    
    // Test remove
    const removed = await removeServiceArea('Test Area 1');
    console.log('✓ Remove service area:', removed);
    results.serviceAreas.passed++;
    
    // Test get after remove
    const areasAfterRemove = await getServiceAreas();
    console.log('✓ Get service areas (after remove):', areasAfterRemove);
    results.serviceAreas.passed++;
    
  } catch (error) {
    console.error('❌ Service Areas test error:', error);
    results.serviceAreas.failed++;
    results.serviceAreas.errors.push(error.message);
  }
  
  // Test Service Types CRUD
  try {
    console.log('\n🛠️ Testing Service Types CRUD...');
    
    // Test get (should return empty array initially)
    const initialServices = await getServiceTypes();
    console.log('✓ Get service types (initial):', initialServices);
    results.serviceTypes.passed++;
    
    // Test add
    const testService = {
      name: 'Test Service',
      priceRange: '$50-$100',
      defaultRate: 75.00
    };
    await addServiceType(testService);
    console.log('✓ Add service type');
    results.serviceTypes.passed++;
    
    // Test get after add
    const servicesAfterAdd = await getServiceTypes();
    console.log('✓ Get service types (after add):', servicesAfterAdd);
    results.serviceTypes.passed++;
    
    // Test update
    const updated = await updateServiceType('Test Service', {
      priceRange: '$60-$120',
      defaultRate: 90.00
    });
    console.log('✓ Update service type:', updated);
    results.serviceTypes.passed++;
    
    // Test get after update
    const servicesAfterUpdate = await getServiceTypes();
    console.log('✓ Get service types (after update):', servicesAfterUpdate);
    results.serviceTypes.passed++;
    
    // Test remove
    const removedService = await removeServiceType('Test Service');
    console.log('✓ Remove service type:', removedService);
    results.serviceTypes.passed++;
    
  } catch (error) {
    console.error('❌ Service Types test error:', error);
    results.serviceTypes.failed++;
    results.serviceTypes.errors.push(error.message);
  }
  
  // Test Payment Methods CRUD
  try {
    console.log('\n💳 Testing Payment Methods CRUD...');
    
    // Test get (should return empty array initially)
    const initialMethods = await getPaymentMethods();
    console.log('✓ Get payment methods (initial):', initialMethods);
    results.paymentMethods.passed++;
    
    // Test add
    await addPaymentMethod('Test Payment');
    await addPaymentMethod('Another Payment');
    console.log('✓ Add payment methods');
    results.paymentMethods.passed++;
    
    // Test get after add
    const methodsAfterAdd = await getPaymentMethods();
    console.log('✓ Get payment methods (after add):', methodsAfterAdd);
    results.paymentMethods.passed++;
    
    // Test remove
    const removedMethod = await removePaymentMethod('Test Payment');
    console.log('✓ Remove payment method:', removedMethod);
    results.paymentMethods.passed++;
    
    // Test get after remove
    const methodsAfterRemove = await getPaymentMethods();
    console.log('✓ Get payment methods (after remove):', methodsAfterRemove);
    results.paymentMethods.passed++;
    
  } catch (error) {
    console.error('❌ Payment Methods test error:', error);
    results.paymentMethods.failed++;
    results.paymentMethods.errors.push(error.message);
  }
  
  // Test Combined Function
  try {
    console.log('\n🔄 Testing Combined Function...');
    
    const allData = await getAllBusinessSettingsData();
    console.log('✓ Get all business settings data:', allData);
    results.combined.passed++;
    
  } catch (error) {
    console.error('❌ Combined function test error:', error);
    results.combined.failed++;
    results.combined.errors.push(error.message);
  }
  
  // Print summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  Object.entries(results).forEach(([category, result]) => {
    const total = result.passed + result.failed;
    const status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(`${category}: ${status} (${result.passed}/${total} passed)`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
  });
  
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;
  
  console.log(`\nOVERALL: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalFailed === 0) {
    console.log('🎉 All business settings database functions are working correctly!');
  } else {
    console.log('⚠️ Some functions need attention. Check errors above.');
  }
  
  return results;
}

/**
 * Test migration utility functions in browser
 */
export function testMigrationUtility() {
  console.log('🧪 Testing Migration Utility Functions...');
  
  try {
    // Test localStorage reading
    const stored = localStorage.getItem('jasonBusinessData');
    console.log('📦 LocalStorage data found:', !!stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('✓ LocalStorage parsed successfully');
      console.log('Business Info:', parsed.businessInfo);
      console.log('Services count:', parsed.services?.length);
      console.log('Payment Methods count:', parsed.paymentMethods?.length);
    }
    
    // Test migration functions
    // Note: Import migration functions dynamically in browser console
    console.log('\n📝 To test migration functions, run:');
    console.log(`
import { getCurrentBusinessSettingsFromStorage, validateBusinessSettingsForMigration, generateBusinessSettingsMigrationPlan } from './src/utils/businessSettingsMigration.js';

const settings = getCurrentBusinessSettingsFromStorage();
console.log('Settings:', settings);

const validation = validateBusinessSettingsForMigration(settings);
console.log('Validation:', validation);

const plan = generateBusinessSettingsMigrationPlan();
console.log('Migration plan:', plan);
    `);
    
  } catch (error) {
    console.error('❌ Migration utility test error:', error);
  }
}

// Make functions available globally for browser testing
if (typeof window !== 'undefined') {
  window.testAllBusinessSettingsFunctions = testAllBusinessSettingsFunctions;
  window.testMigrationUtility = testMigrationUtility;
}

export default {
  testAllBusinessSettingsFunctions,
  testMigrationUtility
};