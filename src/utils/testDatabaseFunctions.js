#!/usr/bin/env node

/**
 * Comprehensive Database Functions Test Script
 * 
 * Tests all business settings database CRUD functions to verify they work correctly.
 * This script can be run directly with Node.js to test database connectivity and operations.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
require('dotenv').config();

// Import database functions to test
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
 * Test configuration and settings
 */
const TEST_CONFIG = {
  cleanup: true, // Remove test data after tests
  verbose: true, // Detailed logging
  continueOnError: false // Stop on first error or continue
};

/**
 * Test data for database operations
 */
const TEST_DATA = {
  businessSettings: {
    name: 'Test Business Name',
    phone: '555-TEST-123',
    email: 'test@testbusiness.com',
    taxRate: 0.075
  },
  serviceAreas: ['Test Area Alpha', 'Test Area Beta', 'Test Area Gamma'],
  serviceTypes: [
    {
      name: 'Test Service Alpha',
      priceRange: '$25-$75',
      defaultRate: 50.00
    },
    {
      name: 'Test Service Beta',
      priceRange: '$100-$200',
      defaultRate: 150.00
    }
  ],
  paymentMethods: ['Test Payment Alpha', 'Test Payment Beta', 'Test Payment Gamma']
};

/**
 * Test results tracking
 */
class TestResults {
  constructor() {
    this.results = {
      businessSettings: { passed: 0, failed: 0, tests: [], errors: [] },
      serviceAreas: { passed: 0, failed: 0, tests: [], errors: [] },
      serviceTypes: { passed: 0, failed: 0, tests: [], errors: [] },
      paymentMethods: { passed: 0, failed: 0, tests: [], errors: [] },
      combined: { passed: 0, failed: 0, tests: [], errors: [] },
      errorHandling: { passed: 0, failed: 0, tests: [], errors: [] }
    };
  }

  addTest(category, testName, passed, error = null) {
    this.results[category].tests.push({ name: testName, passed, error });
    if (passed) {
      this.results[category].passed++;
    } else {
      this.results[category].failed++;
      if (error) {
        this.results[category].errors.push(`${testName}: ${error.message}`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE FUNCTIONS TEST SUMMARY');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.passed + result.failed;
      const status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
      const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
      
      console.log(`\n${category.toUpperCase()}: ${status} (${result.passed}/${total} - ${percentage}%)`);
      
      if (TEST_CONFIG.verbose && result.tests.length > 0) {
        result.tests.forEach(test => {
          const testStatus = test.passed ? '  ✓' : '  ✗';
          console.log(`${testStatus} ${test.name}`);
          if (!test.passed && test.error) {
            console.log(`    Error: ${test.error.message}`);
          }
        });
      }
      
      totalPassed += result.passed;
      totalFailed += result.failed;
    });
    
    const grandTotal = totalPassed + totalFailed;
    const overallPercentage = grandTotal > 0 ? Math.round((totalPassed / grandTotal) * 100) : 0;
    
    console.log('\n' + '-'.repeat(60));
    console.log(`OVERALL RESULT: ${totalPassed}/${grandTotal} tests passed (${overallPercentage}%)`);
    
    if (totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! Database functions are working correctly.');
      return true;
    } else {
      console.log(`⚠️  ${totalFailed} tests failed. See details above.`);
      return false;
    }
  }
}

/**
 * Utility function to run a test safely
 */
async function runTest(testName, testFunction, results, category) {
  try {
    if (TEST_CONFIG.verbose) {
      console.log(`\n🧪 Running: ${testName}`);
    }
    
    await testFunction();
    
    if (TEST_CONFIG.verbose) {
      console.log(`✅ Passed: ${testName}`);
    }
    
    results.addTest(category, testName, true);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed: ${testName}`);
    console.error(`   Error: ${error.message}`);
    
    results.addTest(category, testName, false, error);
    
    if (!TEST_CONFIG.continueOnError) {
      throw error;
    }
    return false;
  }
}

/**
 * Test Business Settings CRUD Operations
 */
async function testBusinessSettingsCRUD(results) {
  console.log('\n📝 Testing Business Settings CRUD Operations...');
  
  let initialSettings = null;
  let updatedSettings = null;
  
  // Test 1: Get business settings (initial state)
  await runTest('Get initial business settings', async () => {
    initialSettings = await getBusinessSettings();
    console.log('   Initial settings:', initialSettings);
    
    // Settings can be null initially or contain existing data
    if (initialSettings !== null && typeof initialSettings !== 'object') {
      throw new Error('Business settings should return null or object');
    }
  }, results, 'businessSettings');
  
  // Test 2: Update business settings
  await runTest('Update business settings', async () => {
    updatedSettings = await updateBusinessSettings(TEST_DATA.businessSettings);
    console.log('   Updated settings:', updatedSettings);
    
    if (!updatedSettings || typeof updatedSettings !== 'object') {
      throw new Error('Update should return updated settings object');
    }
    
    if (updatedSettings.name !== TEST_DATA.businessSettings.name) {
      throw new Error('Business name not updated correctly');
    }
  }, results, 'businessSettings');
  
  // Test 3: Get business settings after update
  await runTest('Get business settings after update', async () => {
    const retrievedSettings = await getBusinessSettings();
    console.log('   Retrieved settings:', retrievedSettings);
    
    if (!retrievedSettings) {
      throw new Error('Settings should exist after update');
    }
    
    if (retrievedSettings.name !== TEST_DATA.businessSettings.name) {
      throw new Error('Retrieved settings do not match updated settings');
    }
  }, results, 'businessSettings');
}

/**
 * Test Service Areas CRUD Operations
 */
async function testServiceAreasCRUD(results) {
  console.log('\n🗺️ Testing Service Areas CRUD Operations...');
  
  let initialAreas = [];
  let areasAfterAdd = [];
  
  // Test 1: Get service areas (initial state)
  await runTest('Get initial service areas', async () => {
    initialAreas = await getServiceAreas();
    console.log('   Initial areas:', initialAreas);
    
    if (!Array.isArray(initialAreas)) {
      throw new Error('Service areas should return an array');
    }
  }, results, 'serviceAreas');
  
  // Test 2: Add service areas
  await runTest('Add test service areas', async () => {
    for (const area of TEST_DATA.serviceAreas) {
      const success = await addServiceArea(area);
      if (!success) {
        throw new Error(`Failed to add service area: ${area}`);
      }
    }
    console.log('   Added areas:', TEST_DATA.serviceAreas);
  }, results, 'serviceAreas');
  
  // Test 3: Get service areas after adding
  await runTest('Get service areas after adding', async () => {
    areasAfterAdd = await getServiceAreas();
    console.log('   Areas after add:', areasAfterAdd);
    
    if (!Array.isArray(areasAfterAdd)) {
      throw new Error('Service areas should return an array');
    }
    
    // Check that our test areas were added
    const hasTestAreas = TEST_DATA.serviceAreas.every(area => 
      areasAfterAdd.includes(area)
    );
    
    if (!hasTestAreas) {
      throw new Error('Not all test areas were added successfully');
    }
  }, results, 'serviceAreas');
  
  // Test 4: Remove a service area
  await runTest('Remove test service area', async () => {
    const areaToRemove = TEST_DATA.serviceAreas[0];
    const success = await removeServiceArea(areaToRemove);
    
    if (!success) {
      throw new Error(`Failed to remove service area: ${areaToRemove}`);
    }
    
    console.log('   Removed area:', areaToRemove);
  }, results, 'serviceAreas');
  
  // Test 5: Verify removal
  await runTest('Verify service area removal', async () => {
    const areasAfterRemove = await getServiceAreas();
    console.log('   Areas after remove:', areasAfterRemove);
    
    const removedArea = TEST_DATA.serviceAreas[0];
    if (areasAfterRemove.includes(removedArea)) {
      throw new Error(`Area ${removedArea} should have been removed`);
    }
  }, results, 'serviceAreas');
}

/**
 * Test Service Types CRUD Operations
 */
async function testServiceTypesCRUD(results) {
  console.log('\n🛠️ Testing Service Types CRUD Operations...');
  
  let initialServices = [];
  
  // Test 1: Get service types (initial state)
  await runTest('Get initial service types', async () => {
    initialServices = await getServiceTypes();
    console.log('   Initial services:', initialServices);
    
    if (!Array.isArray(initialServices)) {
      throw new Error('Service types should return an array');
    }
  }, results, 'serviceTypes');
  
  // Test 2: Add service types
  await runTest('Add test service types', async () => {
    for (const service of TEST_DATA.serviceTypes) {
      const success = await addServiceType(service);
      if (!success) {
        throw new Error(`Failed to add service type: ${service.name}`);
      }
    }
    console.log('   Added services:', TEST_DATA.serviceTypes.map(s => s.name));
  }, results, 'serviceTypes');
  
  // Test 3: Get service types after adding
  await runTest('Get service types after adding', async () => {
    const servicesAfterAdd = await getServiceTypes();
    console.log('   Services after add:', servicesAfterAdd.map(s => s.name));
    
    if (!Array.isArray(servicesAfterAdd)) {
      throw new Error('Service types should return an array');
    }
    
    // Check that our test services were added
    const hasTestServices = TEST_DATA.serviceTypes.every(testService => 
      servicesAfterAdd.some(service => service.name === testService.name)
    );
    
    if (!hasTestServices) {
      throw new Error('Not all test services were added successfully');
    }
  }, results, 'serviceTypes');
  
  // Test 4: Update a service type
  await runTest('Update test service type', async () => {
    const serviceToUpdate = TEST_DATA.serviceTypes[0].name;
    const updates = {
      priceRange: '$30-$80',
      defaultRate: 55.00
    };
    
    const success = await updateServiceType(serviceToUpdate, updates);
    if (!success) {
      throw new Error(`Failed to update service type: ${serviceToUpdate}`);
    }
    
    console.log('   Updated service:', serviceToUpdate, 'with', updates);
  }, results, 'serviceTypes');
  
  // Test 5: Verify update
  await runTest('Verify service type update', async () => {
    const servicesAfterUpdate = await getServiceTypes();
    const updatedService = servicesAfterUpdate.find(s => s.name === TEST_DATA.serviceTypes[0].name);
    
    if (!updatedService) {
      throw new Error('Updated service not found');
    }
    
    if (updatedService.priceRange !== '$30-$80' || updatedService.defaultRate !== 55.00) {
      throw new Error('Service type update did not persist correctly');
    }
    
    console.log('   Verified update:', updatedService);
  }, results, 'serviceTypes');
  
  // Test 6: Remove a service type
  await runTest('Remove test service type', async () => {
    const serviceToRemove = TEST_DATA.serviceTypes[1].name;
    const success = await removeServiceType(serviceToRemove);
    
    if (!success) {
      throw new Error(`Failed to remove service type: ${serviceToRemove}`);
    }
    
    console.log('   Removed service:', serviceToRemove);
  }, results, 'serviceTypes');
}

/**
 * Test Payment Methods CRUD Operations
 */
async function testPaymentMethodsCRUD(results) {
  console.log('\n💳 Testing Payment Methods CRUD Operations...');
  
  let initialMethods = [];
  
  // Test 1: Get payment methods (initial state)
  await runTest('Get initial payment methods', async () => {
    initialMethods = await getPaymentMethods();
    console.log('   Initial methods:', initialMethods);
    
    if (!Array.isArray(initialMethods)) {
      throw new Error('Payment methods should return an array');
    }
  }, results, 'paymentMethods');
  
  // Test 2: Add payment methods
  await runTest('Add test payment methods', async () => {
    for (const method of TEST_DATA.paymentMethods) {
      const success = await addPaymentMethod(method);
      if (!success) {
        throw new Error(`Failed to add payment method: ${method}`);
      }
    }
    console.log('   Added methods:', TEST_DATA.paymentMethods);
  }, results, 'paymentMethods');
  
  // Test 3: Get payment methods after adding
  await runTest('Get payment methods after adding', async () => {
    const methodsAfterAdd = await getPaymentMethods();
    console.log('   Methods after add:', methodsAfterAdd);
    
    if (!Array.isArray(methodsAfterAdd)) {
      throw new Error('Payment methods should return an array');
    }
    
    // Check that our test methods were added
    const hasTestMethods = TEST_DATA.paymentMethods.every(method => 
      methodsAfterAdd.includes(method)
    );
    
    if (!hasTestMethods) {
      throw new Error('Not all test payment methods were added successfully');
    }
  }, results, 'paymentMethods');
  
  // Test 4: Remove a payment method
  await runTest('Remove test payment method', async () => {
    const methodToRemove = TEST_DATA.paymentMethods[0];
    const success = await removePaymentMethod(methodToRemove);
    
    if (!success) {
      throw new Error(`Failed to remove payment method: ${methodToRemove}`);
    }
    
    console.log('   Removed method:', methodToRemove);
  }, results, 'paymentMethods');
  
  // Test 5: Verify removal
  await runTest('Verify payment method removal', async () => {
    const methodsAfterRemove = await getPaymentMethods();
    console.log('   Methods after remove:', methodsAfterRemove);
    
    const removedMethod = TEST_DATA.paymentMethods[0];
    if (methodsAfterRemove.includes(removedMethod)) {
      throw new Error(`Method ${removedMethod} should have been removed`);
    }
  }, results, 'paymentMethods');
}

/**
 * Test Combined Operations
 */
async function testCombinedOperations(results) {
  console.log('\n🔄 Testing Combined Operations...');
  
  // Test 1: Get all business settings data
  await runTest('Get all business settings data', async () => {
    const allData = await getAllBusinessSettingsData();
    console.log('   All data structure:', {
      hasBusinessInfo: !!allData.businessInfo,
      serviceAreasCount: allData.serviceAreas?.length || 0,
      servicesCount: allData.services?.length || 0,
      paymentMethodsCount: allData.paymentMethods?.length || 0
    });
    
    if (!allData || typeof allData !== 'object') {
      throw new Error('getAllBusinessSettingsData should return an object');
    }
    
    if (!Array.isArray(allData.serviceAreas)) {
      throw new Error('serviceAreas should be an array');
    }
    
    if (!Array.isArray(allData.services)) {
      throw new Error('services should be an array');
    }
    
    if (!Array.isArray(allData.paymentMethods)) {
      throw new Error('paymentMethods should be an array');
    }
    
    // Business info can be null if not set yet
    if (allData.businessInfo !== null && typeof allData.businessInfo !== 'object') {
      throw new Error('businessInfo should be null or object');
    }
  }, results, 'combined');
}

/**
 * Test Error Handling
 */
async function testErrorHandling(results) {
  console.log('\n⚠️ Testing Error Handling...');
  
  // Test 1: Invalid service area input
  await runTest('Handle invalid service area input', async () => {
    try {
      await addServiceArea('');
      throw new Error('Should have thrown error for empty service area');
    } catch (error) {
      if (error.message.includes('Service area name is required')) {
        // Expected error - this is correct
        console.log('   ✓ Correctly rejected empty service area');
      } else {
        throw error;
      }
    }
  }, results, 'errorHandling');
  
  // Test 2: Invalid service type input
  await runTest('Handle invalid service type input', async () => {
    try {
      await addServiceType({ name: '', defaultRate: 0 });
      throw new Error('Should have thrown error for invalid service type');
    } catch (error) {
      if (error.message.includes('Service name is required') || 
          error.message.includes('Valid default rate is required')) {
        // Expected error - this is correct
        console.log('   ✓ Correctly rejected invalid service type');
      } else {
        throw error;
      }
    }
  }, results, 'errorHandling');
  
  // Test 3: Invalid payment method input
  await runTest('Handle invalid payment method input', async () => {
    try {
      await addPaymentMethod('');
      throw new Error('Should have thrown error for empty payment method');
    } catch (error) {
      if (error.message.includes('Payment method name is required')) {
        // Expected error - this is correct
        console.log('   ✓ Correctly rejected empty payment method');
      } else {
        throw error;
      }
    }
  }, results, 'errorHandling');
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  if (!TEST_CONFIG.cleanup) {
    console.log('\n🧹 Cleanup disabled - test data remains in database');
    return;
  }
  
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test service areas
    for (const area of TEST_DATA.serviceAreas) {
      try {
        await removeServiceArea(area);
      } catch (error) {
        console.log(`   Note: Could not remove area ${area} (may already be removed)`);
      }
    }
    
    // Remove test service types
    for (const service of TEST_DATA.serviceTypes) {
      try {
        await removeServiceType(service.name);
      } catch (error) {
        console.log(`   Note: Could not remove service ${service.name} (may already be removed)`);
      }
    }
    
    // Remove test payment methods
    for (const method of TEST_DATA.paymentMethods) {
      try {
        await removePaymentMethod(method);
      } catch (error) {
        console.log(`   Note: Could not remove method ${method} (may already be removed)`);
      }
    }
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.error('⚠️ Error during cleanup:', error.message);
    console.log('   Test data may remain in database - manually clean if needed');
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Database Functions Test Suite');
  console.log('=' .repeat(60));
  
  // Check environment variables
  if (!process.env.REACT_APP_TURSO_DATABASE_URL) {
    console.error('❌ REACT_APP_TURSO_DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.REACT_APP_TURSO_AUTH_TOKEN) {
    console.error('❌ REACT_APP_TURSO_AUTH_TOKEN environment variable is required');
    process.exit(1);
  }
  
  console.log('✅ Environment variables configured');
  
  const results = new TestResults();
  let allTestsPassed = true;
  
  try {
    // Run all test suites
    await testBusinessSettingsCRUD(results);
    await testServiceAreasCRUD(results);
    await testServiceTypesCRUD(results);
    await testPaymentMethodsCRUD(results);
    await testCombinedOperations(results);
    await testErrorHandling(results);
    
  } catch (error) {
    console.error('\n💥 Test suite failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    allTestsPassed = false;
  } finally {
    // Always try to clean up
    await cleanupTestData();
    
    // Print final results
    const testsPassed = results.printSummary();
    allTestsPassed = allTestsPassed && testsPassed;
  }
  
  // Exit with appropriate code
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export default {
  runAllTests,
  testBusinessSettingsCRUD,
  testServiceAreasCRUD,
  testServiceTypesCRUD,
  testPaymentMethodsCRUD,
  testCombinedOperations,
  testErrorHandling
};