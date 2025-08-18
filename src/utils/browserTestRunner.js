/**
 * Browser-Based Database Functions Test Runner
 * 
 * This module provides functions to test database operations in the browser console
 * where React environment variables are available.
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
} from './databaseHelpers.js';

/**
 * Test data for browser tests
 */
const BROWSER_TEST_DATA = {
  businessSettings: {
    name: 'Browser Test Business',
    phone: '555-BROWSER-TEST',
    email: 'test@browsertest.com',
    taxRate: 0.085
  },
  serviceAreas: ['Browser Test Area 1', 'Browser Test Area 2'],
  serviceTypes: [
    {
      name: 'Browser Test Service',
      priceRange: '$40-$80',
      defaultRate: 60.00
    }
  ],
  paymentMethods: ['Browser Test Payment']
};

/**
 * Simple test runner for browser console
 */
class BrowserTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Running: ${testName}`);
      await testFn();
      console.log(`✅ Passed: ${testName}`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
      return true;
    } catch (error) {
      console.error(`❌ Failed: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      return false;
    }
  }

  printResults() {
    const total = this.results.passed + this.results.failed;
    const percentage = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 BROWSER TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (this.results.failed > 0) {
      console.log('\nFailed Tests:');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.error}`));
    }
    
    console.log(this.results.failed === 0 ? '\n🎉 All tests passed!' : '\n⚠️ Some tests failed.');
    
    return this.results.failed === 0;
  }
}

/**
 * Run read-only tests first
 */
export async function runReadOnlyTests() {
  console.log('🔍 Running Read-Only Database Tests...');
  const runner = new BrowserTestRunner();
  
  // Test 1: Check environment variables
  await runner.runTest('Environment Variables Check', async () => {
    if (!process.env.REACT_APP_TURSO_DATABASE_URL) {
      throw new Error('REACT_APP_TURSO_DATABASE_URL not found');
    }
    if (!process.env.REACT_APP_TURSO_AUTH_TOKEN) {
      throw new Error('REACT_APP_TURSO_AUTH_TOKEN not found');
    }
    console.log('   ✓ Environment variables are configured');
  });
  
  // Test 2: Get business settings
  await runner.runTest('Get Business Settings', async () => {
    const settings = await getBusinessSettings();
    console.log('   Current settings:', settings);
    if (settings !== null && typeof settings !== 'object') {
      throw new Error('Business settings should be null or object');
    }
  });
  
  // Test 3: Get service areas
  await runner.runTest('Get Service Areas', async () => {
    const areas = await getServiceAreas();
    console.log('   Current areas:', areas);
    if (!Array.isArray(areas)) {
      throw new Error('Service areas should return an array');
    }
  });
  
  // Test 4: Get service types
  await runner.runTest('Get Service Types', async () => {
    const services = await getServiceTypes();
    console.log('   Current services:', services.map(s => s.name));
    if (!Array.isArray(services)) {
      throw new Error('Service types should return an array');
    }
  });
  
  // Test 5: Get payment methods
  await runner.runTest('Get Payment Methods', async () => {
    const methods = await getPaymentMethods();
    console.log('   Current methods:', methods);
    if (!Array.isArray(methods)) {
      throw new Error('Payment methods should return an array');
    }
  });
  
  // Test 6: Get all business data
  await runner.runTest('Get All Business Data', async () => {
    const allData = await getAllBusinessSettingsData();
    console.log('   Data structure:', {
      hasBusinessInfo: !!allData.businessInfo,
      serviceAreasCount: allData.serviceAreas?.length || 0,
      servicesCount: allData.services?.length || 0,
      paymentMethodsCount: allData.paymentMethods?.length || 0
    });
    
    if (!allData || typeof allData !== 'object') {
      throw new Error('All business data should return an object');
    }
  });
  
  return runner.printResults();
}

/**
 * Run write operation tests
 */
export async function runWriteTests() {
  console.log('✏️ Running Write Operation Database Tests...');
  const runner = new BrowserTestRunner();
  
  // Test 1: Update business settings
  await runner.runTest('Update Business Settings', async () => {
    const updated = await updateBusinessSettings(BROWSER_TEST_DATA.businessSettings);
    console.log('   Updated settings:', updated);
    
    if (!updated || updated.name !== BROWSER_TEST_DATA.businessSettings.name) {
      throw new Error('Business settings update failed');
    }
  });
  
  // Test 2: Add service area
  await runner.runTest('Add Service Area', async () => {
    const success = await addServiceArea(BROWSER_TEST_DATA.serviceAreas[0]);
    if (!success) {
      throw new Error('Failed to add service area');
    }
    
    // Verify it was added
    const areas = await getServiceAreas();
    if (!areas.includes(BROWSER_TEST_DATA.serviceAreas[0])) {
      throw new Error('Service area was not added correctly');
    }
    console.log('   ✓ Service area added and verified');
  });
  
  // Test 3: Add service type
  await runner.runTest('Add Service Type', async () => {
    const success = await addServiceType(BROWSER_TEST_DATA.serviceTypes[0]);
    if (!success) {
      throw new Error('Failed to add service type');
    }
    
    // Verify it was added
    const services = await getServiceTypes();
    if (!services.some(s => s.name === BROWSER_TEST_DATA.serviceTypes[0].name)) {
      throw new Error('Service type was not added correctly');
    }
    console.log('   ✓ Service type added and verified');
  });
  
  // Test 4: Add payment method
  await runner.runTest('Add Payment Method', async () => {
    const success = await addPaymentMethod(BROWSER_TEST_DATA.paymentMethods[0]);
    if (!success) {
      throw new Error('Failed to add payment method');
    }
    
    // Verify it was added
    const methods = await getPaymentMethods();
    if (!methods.includes(BROWSER_TEST_DATA.paymentMethods[0])) {
      throw new Error('Payment method was not added correctly');
    }
    console.log('   ✓ Payment method added and verified');
  });
  
  // Test 5: Update service type
  await runner.runTest('Update Service Type', async () => {
    const updates = { priceRange: '$50-$90', defaultRate: 70.00 };
    const success = await updateServiceType(BROWSER_TEST_DATA.serviceTypes[0].name, updates);
    
    if (!success) {
      throw new Error('Failed to update service type');
    }
    
    // Verify the update
    const services = await getServiceTypes();
    const updated = services.find(s => s.name === BROWSER_TEST_DATA.serviceTypes[0].name);
    if (!updated || updated.priceRange !== '$50-$90') {
      throw new Error('Service type update was not applied correctly');
    }
    console.log('   ✓ Service type updated and verified');
  });
  
  return runner.printResults();
}

/**
 * Clean up test data
 */
export async function cleanupBrowserTests() {
  console.log('🧹 Cleaning up browser test data...');
  
  try {
    // Remove test service area
    await removeServiceArea(BROWSER_TEST_DATA.serviceAreas[0]);
    console.log('   ✓ Removed test service area');
  } catch (error) {
    console.log('   Note: Could not remove test service area:', error.message);
  }
  
  try {
    // Remove test service type
    await removeServiceType(BROWSER_TEST_DATA.serviceTypes[0].name);
    console.log('   ✓ Removed test service type');
  } catch (error) {
    console.log('   Note: Could not remove test service type:', error.message);
  }
  
  try {
    // Remove test payment method
    await removePaymentMethod(BROWSER_TEST_DATA.paymentMethods[0]);
    console.log('   ✓ Removed test payment method');
  } catch (error) {
    console.log('   Note: Could not remove test payment method:', error.message);
  }
  
  console.log('🧹 Cleanup completed');
}

/**
 * Test error handling
 */
export async function testErrorHandling() {
  console.log('⚠️ Testing Error Handling...');
  const runner = new BrowserTestRunner();
  
  // Test 1: Invalid service area
  await runner.runTest('Invalid Service Area Input', async () => {
    try {
      await addServiceArea('');
      throw new Error('Should have thrown error for empty area');
    } catch (error) {
      if (!error.message.includes('Service area name is required')) {
        throw error;
      }
      console.log('   ✓ Correctly rejected empty service area');
    }
  });
  
  // Test 2: Invalid service type
  await runner.runTest('Invalid Service Type Input', async () => {
    try {
      await addServiceType({ name: '', defaultRate: 0 });
      throw new Error('Should have thrown error for invalid service');
    } catch (error) {
      if (!error.message.includes('Service name is required') && 
          !error.message.includes('Valid default rate is required')) {
        throw error;
      }
      console.log('   ✓ Correctly rejected invalid service type');
    }
  });
  
  return runner.printResults();
}

/**
 * Run complete test suite
 */
export async function runCompleteTestSuite() {
  console.log('🚀 Starting Complete Database Functions Test Suite');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Run read-only tests first
  const readOnlyPassed = await runReadOnlyTests();
  allPassed = allPassed && readOnlyPassed;
  
  if (readOnlyPassed) {
    // Run write tests
    const writePassed = await runWriteTests();
    allPassed = allPassed && writePassed;
    
    // Test error handling
    const errorHandlingPassed = await testErrorHandling();
    allPassed = allPassed && errorHandlingPassed;
    
    // Clean up
    await cleanupBrowserTests();
  } else {
    console.log('❌ Skipping write tests due to read-only test failures');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(allPassed ? 
    '🎉 ALL DATABASE FUNCTIONS WORKING CORRECTLY!' : 
    '⚠️ SOME DATABASE FUNCTIONS NEED ATTENTION'
  );
  console.log('='.repeat(60));
  
  return allPassed;
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  window.runReadOnlyTests = runReadOnlyTests;
  window.runWriteTests = runWriteTests;
  window.cleanupBrowserTests = cleanupBrowserTests;
  window.testErrorHandling = testErrorHandling;
  window.runCompleteTestSuite = runCompleteTestSuite;
  
  // Log instructions
  console.log('🧪 Database Test Functions Available:');
  console.log('runReadOnlyTests() - Test read operations');
  console.log('runWriteTests() - Test write operations');
  console.log('testErrorHandling() - Test error handling');
  console.log('runCompleteTestSuite() - Run all tests');
  console.log('cleanupBrowserTests() - Clean up test data');
}

const browserTestRunner = {
  runReadOnlyTests,
  runWriteTests,
  testErrorHandling,
  cleanupBrowserTests,
  runCompleteTestSuite
};

export default browserTestRunner;