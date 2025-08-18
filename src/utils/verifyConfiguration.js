/**
 * Configuration Verification Script
 * 
 * This script verifies that Jason's business configuration was properly preserved
 * during the migration from localStorage to database.
 */

import { getAllBusinessSettingsData } from './databaseHelpers.js';
import { getCurrentBusinessSettingsFromStorage } from './businessSettingsMigration.js';

/**
 * Expected Jason's configuration based on jasonData.js
 */
const EXPECTED_JASONS_CONFIG = {
  businessInfo: {
    name: "Trusting and Affordable Tree Service and Lawn Care",
    phone: "516-580-1223",
    email: "Trustingandaffordabletrees@gmail.com",
    taxRate: 0 // No tax applied per business requirements
  },
  serviceAreas: ["Sarasota", "Bradenton", "Nokomis", "Osprey", "North Venice"],
  services: [
    { name: "Weekly Mowing", priceRange: "$35-$75", defaultRate: 50.00 },
    { name: "Bi-weekly Mowing", priceRange: "$35-$75", defaultRate: 45.00 },
    { name: "Hedge Trimming", priceRange: "$125-$750", defaultRate: 200.00 },
    { name: "Tree Trimming", priceRange: "$250-$2500", defaultRate: 500.00 },
    { name: "Weed Control", priceRange: "$25-$75", defaultRate: 50.00 },
    { name: "Pressure Washing", priceRange: "$150-$1000", defaultRate: 300.00 },
    { name: "Mulch Application", priceRange: "$125-$1000", defaultRate: 250.00 },
    { name: "Landscape Reconstruction", priceRange: "$500-$5000", defaultRate: 1500.00 },
    { name: "Deep Root Fertilization", priceRange: "$125-$200", defaultRate: 150.00 },
    { name: "Gutter Cleaning", priceRange: "$125-$250", defaultRate: 175.00 }
  ],
  paymentMethods: ["Cash", "Check", "Venmo", "Zelle", "Cash App", "Credit Card", "Email Invoice"]
};

/**
 * Verify business information matches expected values
 */
function verifyBusinessInfo(actual, expected) {
  const issues = [];
  
  if (!actual) {
    issues.push('Business info is missing');
    return { valid: false, issues };
  }
  
  if (actual.name !== expected.name) {
    issues.push(`Business name mismatch: expected "${expected.name}", got "${actual.name}"`);
  }
  
  if (actual.phone !== expected.phone) {
    issues.push(`Phone mismatch: expected "${expected.phone}", got "${actual.phone}"`);
  }
  
  if (actual.email !== expected.email) {
    issues.push(`Email mismatch: expected "${expected.email}", got "${actual.email}"`);
  }
  
  if (Math.abs((actual.taxRate || 0) - expected.taxRate) > 0.001) {
    issues.push(`Tax rate mismatch: expected ${expected.taxRate}, got ${actual.taxRate || 0}`);
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Verify service areas match expected values
 */
function verifyServiceAreas(actual, expected) {
  const issues = [];
  
  if (!Array.isArray(actual)) {
    issues.push('Service areas should be an array');
    return { valid: false, issues };
  }
  
  // Check all expected areas are present
  for (const expectedArea of expected) {
    if (!actual.includes(expectedArea)) {
      issues.push(`Missing service area: ${expectedArea}`);
    }
  }
  
  // Check for unexpected areas
  for (const actualArea of actual) {
    if (!expected.includes(actualArea)) {
      issues.push(`Unexpected service area: ${actualArea}`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Verify services match expected values
 */
function verifyServices(actual, expected) {
  const issues = [];
  
  if (!Array.isArray(actual)) {
    issues.push('Services should be an array');
    return { valid: false, issues };
  }
  
  // Check all expected services are present
  for (const expectedService of expected) {
    const actualService = actual.find(s => s.name === expectedService.name);
    
    if (!actualService) {
      issues.push(`Missing service: ${expectedService.name}`);
    } else {
      if (actualService.priceRange !== expectedService.priceRange) {
        issues.push(`Service "${expectedService.name}" price range mismatch: expected "${expectedService.priceRange}", got "${actualService.priceRange}"`);
      }
      
      if (Math.abs(actualService.defaultRate - expectedService.defaultRate) > 0.01) {
        issues.push(`Service "${expectedService.name}" default rate mismatch: expected ${expectedService.defaultRate}, got ${actualService.defaultRate}`);
      }
    }
  }
  
  // Check for unexpected services (allow additional services)
  const expectedNames = expected.map(s => s.name);
  const unexpectedServices = actual.filter(s => !expectedNames.includes(s.name));
  
  if (unexpectedServices.length > 0) {
    issues.push(`Found ${unexpectedServices.length} additional services: ${unexpectedServices.map(s => s.name).join(', ')}`);
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Verify payment methods match expected values
 */
function verifyPaymentMethods(actual, expected) {
  const issues = [];
  
  if (!Array.isArray(actual)) {
    issues.push('Payment methods should be an array');
    return { valid: false, issues };
  }
  
  // Check all expected payment methods are present
  for (const expectedMethod of expected) {
    if (!actual.includes(expectedMethod)) {
      issues.push(`Missing payment method: ${expectedMethod}`);
    }
  }
  
  // Check for unexpected payment methods (allow additional methods)
  const unexpectedMethods = actual.filter(m => !expected.includes(m));
  
  if (unexpectedMethods.length > 0) {
    issues.push(`Found ${unexpectedMethods.length} additional payment methods: ${unexpectedMethods.join(', ')}`);
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Comprehensive configuration verification
 */
export async function verifyJasonsConfiguration() {
  console.log('🔍 Verifying Jason\'s Configuration Preservation...');
  console.log('='.repeat(60));
  
  const verificationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    sections: {
      businessInfo: { valid: false, issues: [] },
      serviceAreas: { valid: false, issues: [] },
      services: { valid: false, issues: [] },
      paymentMethods: { valid: false, issues: [] }
    },
    summary: {
      totalIssues: 0,
      sectionsValid: 0,
      sectionsTotal: 4
    }
  };
  
  try {
    // Get current database configuration
    console.log('📊 Reading current database configuration...');
    const dbConfig = await getAllBusinessSettingsData();
    
    console.log('Database configuration loaded:');
    console.log(`  Business Info: ${!!dbConfig.businessInfo}`);
    console.log(`  Service Areas: ${dbConfig.serviceAreas?.length || 0}`);
    console.log(`  Services: ${dbConfig.services?.length || 0}`);
    console.log(`  Payment Methods: ${dbConfig.paymentMethods?.length || 0}`);
    
    // Verify each section
    console.log('\n🏢 Verifying Business Information...');
    verificationResult.sections.businessInfo = verifyBusinessInfo(
      dbConfig.businessInfo, 
      EXPECTED_JASONS_CONFIG.businessInfo
    );
    
    if (verificationResult.sections.businessInfo.valid) {
      console.log('  ✅ Business information matches expected values');
    } else {
      console.log('  ❌ Business information issues:');
      verificationResult.sections.businessInfo.issues.forEach(issue => 
        console.log(`    - ${issue}`)
      );
    }
    
    console.log('\n🗺️ Verifying Service Areas...');
    verificationResult.sections.serviceAreas = verifyServiceAreas(
      dbConfig.serviceAreas,
      EXPECTED_JASONS_CONFIG.serviceAreas
    );
    
    if (verificationResult.sections.serviceAreas.valid) {
      console.log('  ✅ Service areas match expected values');
      console.log(`  Found: ${dbConfig.serviceAreas.join(', ')}`);
    } else {
      console.log('  ❌ Service areas issues:');
      verificationResult.sections.serviceAreas.issues.forEach(issue => 
        console.log(`    - ${issue}`)
      );
    }
    
    console.log('\n🛠️ Verifying Services...');
    verificationResult.sections.services = verifyServices(
      dbConfig.services,
      EXPECTED_JASONS_CONFIG.services
    );
    
    if (verificationResult.sections.services.valid) {
      console.log('  ✅ Services match expected values');
      console.log(`  Found ${dbConfig.services.length} services`);
    } else {
      console.log('  ❌ Services issues:');
      verificationResult.sections.services.issues.forEach(issue => 
        console.log(`    - ${issue}`)
      );
    }
    
    console.log('\n💳 Verifying Payment Methods...');
    verificationResult.sections.paymentMethods = verifyPaymentMethods(
      dbConfig.paymentMethods,
      EXPECTED_JASONS_CONFIG.paymentMethods
    );
    
    if (verificationResult.sections.paymentMethods.valid) {
      console.log('  ✅ Payment methods match expected values');
      console.log(`  Found: ${dbConfig.paymentMethods.join(', ')}`);
    } else {
      console.log('  ❌ Payment methods issues:');
      verificationResult.sections.paymentMethods.issues.forEach(issue => 
        console.log(`    - ${issue}`)
      );
    }
    
    // Calculate summary
    verificationResult.summary.sectionsValid = Object.values(verificationResult.sections)
      .filter(section => section.valid).length;
    
    verificationResult.summary.totalIssues = Object.values(verificationResult.sections)
      .reduce((total, section) => total + section.issues.length, 0);
    
    verificationResult.success = verificationResult.summary.sectionsValid === verificationResult.summary.sectionsTotal;
    
    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONFIGURATION VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Sections Valid: ${verificationResult.summary.sectionsValid}/${verificationResult.summary.sectionsTotal}`);
    console.log(`Total Issues: ${verificationResult.summary.totalIssues}`);
    
    if (verificationResult.success) {
      console.log('🎉 SUCCESS: Jason\'s configuration has been properly preserved!');
    } else {
      console.log('⚠️ WARNING: Some configuration issues were found. Check details above.');
    }
    
    return verificationResult;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    verificationResult.sections.error = {
      valid: false,
      issues: [error.message]
    };
    return verificationResult;
  }
}

/**
 * Compare localStorage vs database configuration
 */
export async function compareLocalStorageVsDatabase() {
  console.log('🔄 Comparing localStorage vs Database Configuration...');
  
  try {
    const localStorageData = getCurrentBusinessSettingsFromStorage();
    const databaseData = await getAllBusinessSettingsData();
    
    console.log('\nLocalStorage Configuration:');
    console.log(`  Business Name: ${localStorageData.businessInfo?.name}`);
    console.log(`  Service Areas: ${localStorageData.serviceAreas?.length || 0}`);
    console.log(`  Services: ${localStorageData.services?.length || 0}`);
    console.log(`  Payment Methods: ${localStorageData.paymentMethods?.length || 0}`);
    
    console.log('\nDatabase Configuration:');
    console.log(`  Business Name: ${databaseData.businessInfo?.name}`);
    console.log(`  Service Areas: ${databaseData.serviceAreas?.length || 0}`);
    console.log(`  Services: ${databaseData.services?.length || 0}`);
    console.log(`  Payment Methods: ${databaseData.paymentMethods?.length || 0}`);
    
    const matches = {
      businessName: localStorageData.businessInfo?.name === databaseData.businessInfo?.name,
      serviceAreasCount: localStorageData.serviceAreas?.length === databaseData.serviceAreas?.length,
      servicesCount: localStorageData.services?.length === databaseData.services?.length,
      paymentMethodsCount: localStorageData.paymentMethods?.length === databaseData.paymentMethods?.length
    };
    
    console.log('\nComparison Results:');
    console.log(`  Business Name Match: ${matches.businessName ? '✅' : '❌'}`);
    console.log(`  Service Areas Count Match: ${matches.serviceAreasCount ? '✅' : '❌'}`);
    console.log(`  Services Count Match: ${matches.servicesCount ? '✅' : '❌'}`);
    console.log(`  Payment Methods Count Match: ${matches.paymentMethodsCount ? '✅' : '❌'}`);
    
    const allMatch = Object.values(matches).every(match => match);
    console.log(`\nOverall: ${allMatch ? '✅ Configurations match' : '❌ Configurations differ'}`);
    
    return { matches, allMatch, localStorageData, databaseData };
    
  } catch (error) {
    console.error('Comparison failed:', error.message);
    return { error: error.message };
  }
}

// Make functions available globally for browser testing
if (typeof window !== 'undefined') {
  window.verifyJasonsConfiguration = verifyJasonsConfiguration;
  window.compareLocalStorageVsDatabase = compareLocalStorageVsDatabase;
  
  console.log('🔧 Configuration verification functions available:');
  console.log('verifyJasonsConfiguration() - Verify configuration matches expected');
  console.log('compareLocalStorageVsDatabase() - Compare localStorage vs database');
}

export default {
  verifyJasonsConfiguration,
  compareLocalStorageVsDatabase,
  EXPECTED_JASONS_CONFIG
};