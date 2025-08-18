/**
 * Execute Business Settings Migration
 * 
 * This script executes the one-time migration from localStorage to database.
 * It preserves Jason's current configuration and populates the database.
 */

import {
  getCurrentBusinessSettingsFromStorage,
  validateBusinessSettingsForMigration
} from './businessSettingsMigration.js';

import {
  updateBusinessSettings,
  addServiceArea,
  addServiceType,
  addPaymentMethod,
  getAllBusinessSettingsData
} from './databaseHelpers.js';

/**
 * Execute the complete migration process
 * @returns {Promise<Object>} Migration result
 */
export async function executeBusinessSettingsMigration() {
  console.log('🚀 Starting Business Settings Migration...');
  console.log('='.repeat(50));
  
  const migrationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    data: {
      before: null,
      after: null
    }
  };
  
  try {
    // Step 1: Read current localStorage data
    console.log('📦 Step 1: Reading localStorage data...');
    const currentData = getCurrentBusinessSettingsFromStorage();
    migrationResult.data.before = currentData;
    migrationResult.steps.push({
      step: 'Read localStorage',
      status: 'success',
      details: {
        businessInfo: !!currentData.businessInfo,
        serviceAreasCount: currentData.serviceAreas?.length || 0,
        servicesCount: currentData.services?.length || 0,
        paymentMethodsCount: currentData.paymentMethods?.length || 0
      }
    });
    
    console.log('   ✓ Business Info:', currentData.businessInfo?.name);
    console.log('   ✓ Service Areas:', currentData.serviceAreas?.length || 0);
    console.log('   ✓ Services:', currentData.services?.length || 0);
    console.log('   ✓ Payment Methods:', currentData.paymentMethods?.length || 0);
    
    // Step 2: Validate data
    console.log('\n🔍 Step 2: Validating data...');
    const validation = validateBusinessSettingsForMigration(currentData);
    
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.issues.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.log('   ⚠️ Warnings:', validation.warnings.join(', '));
    }
    
    migrationResult.steps.push({
      step: 'Validate data',
      status: 'success',
      details: validation.summary
    });
    
    console.log('   ✓ Data validation passed');
    
    // Step 3: Migrate business settings
    console.log('\n📝 Step 3: Migrating business settings...');
    if (currentData.businessInfo) {
      await updateBusinessSettings({
        name: currentData.businessInfo.name,
        phone: currentData.businessInfo.phone,
        email: currentData.businessInfo.email,
        taxRate: currentData.businessInfo.taxRate || 0
      });
      
      migrationResult.steps.push({
        step: 'Migrate business info',
        status: 'success',
        details: { name: currentData.businessInfo.name }
      });
      
      console.log('   ✓ Business info migrated');
    }
    
    // Step 4: Migrate service areas
    console.log('\n🗺️ Step 4: Migrating service areas...');
    let areasAdded = 0;
    for (const area of currentData.serviceAreas || []) {
      try {
        await addServiceArea(area);
        areasAdded++;
        console.log(`   ✓ Added service area: ${area}`);
      } catch (error) {
        console.log(`   ⚠️ Service area may already exist: ${area}`);
      }
    }
    
    migrationResult.steps.push({
      step: 'Migrate service areas',
      status: 'success',
      details: { areasAdded, totalAreas: currentData.serviceAreas?.length || 0 }
    });
    
    // Step 5: Migrate service types
    console.log('\n🛠️ Step 5: Migrating service types...');
    let servicesAdded = 0;
    for (const service of currentData.services || []) {
      try {
        await addServiceType({
          name: service.name,
          priceRange: service.priceRange,
          defaultRate: service.defaultRate
        });
        servicesAdded++;
        console.log(`   ✓ Added service: ${service.name}`);
      } catch (error) {
        console.log(`   ⚠️ Service may already exist: ${service.name}`);
      }
    }
    
    migrationResult.steps.push({
      step: 'Migrate service types',
      status: 'success',
      details: { servicesAdded, totalServices: currentData.services?.length || 0 }
    });
    
    // Step 6: Migrate payment methods
    console.log('\n💳 Step 6: Migrating payment methods...');
    let methodsAdded = 0;
    for (const method of currentData.paymentMethods || []) {
      try {
        await addPaymentMethod(method);
        methodsAdded++;
        console.log(`   ✓ Added payment method: ${method}`);
      } catch (error) {
        console.log(`   ⚠️ Payment method may already exist: ${method}`);
      }
    }
    
    migrationResult.steps.push({
      step: 'Migrate payment methods',
      status: 'success',
      details: { methodsAdded, totalMethods: currentData.paymentMethods?.length || 0 }
    });
    
    // Step 7: Verify migration
    console.log('\n✅ Step 7: Verifying migration...');
    const afterData = await getAllBusinessSettingsData();
    migrationResult.data.after = afterData;
    
    console.log('   Database state after migration:');
    console.log('   ✓ Business Info:', afterData.businessInfo?.name);
    console.log('   ✓ Service Areas:', afterData.serviceAreas?.length || 0);
    console.log('   ✓ Services:', afterData.services?.length || 0);
    console.log('   ✓ Payment Methods:', afterData.paymentMethods?.length || 0);
    
    migrationResult.steps.push({
      step: 'Verify migration',
      status: 'success',
      details: {
        businessInfo: !!afterData.businessInfo,
        serviceAreasCount: afterData.serviceAreas?.length || 0,
        servicesCount: afterData.services?.length || 0,
        paymentMethodsCount: afterData.paymentMethods?.length || 0
      }
    });
    
    // Step 8: Mark migration complete
    migrationResult.success = true;
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    
    migrationResult.errors.push({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    migrationResult.steps.push({
      step: 'Migration failed',
      status: 'error',
      details: { error: error.message }
    });
  }
  
  // Save migration log
  try {
    localStorage.setItem('businessSettingsMigrationLog', JSON.stringify(migrationResult));
    console.log('📄 Migration log saved to localStorage');
  } catch (error) {
    console.warn('Could not save migration log:', error.message);
  }
  
  return migrationResult;
}

/**
 * Check if migration has already been executed
 * @returns {boolean} True if migration was already completed
 */
export function isMigrationCompleted() {
  try {
    const migrationLog = localStorage.getItem('businessSettingsMigrationLog');
    if (migrationLog) {
      const log = JSON.parse(migrationLog);
      return log.success === true;
    }
  } catch (error) {
    console.warn('Could not check migration status:', error.message);
  }
  return false;
}

/**
 * Get migration log from localStorage
 * @returns {Object|null} Migration log or null
 */
export function getMigrationLog() {
  try {
    const migrationLog = localStorage.getItem('businessSettingsMigrationLog');
    if (migrationLog) {
      return JSON.parse(migrationLog);
    }
  } catch (error) {
    console.warn('Could not read migration log:', error.message);
  }
  return null;
}

/**
 * Reset migration flag (for testing purposes)
 * WARNING: This will allow migration to run again
 */
export function resetMigrationFlag() {
  try {
    localStorage.removeItem('businessSettingsMigrationLog');
    console.log('⚠️ Migration flag reset - migration can run again');
    return true;
  } catch (error) {
    console.error('Could not reset migration flag:', error.message);
    return false;
  }
}

// Make functions available globally for browser testing
if (typeof window !== 'undefined') {
  window.executeBusinessSettingsMigration = executeBusinessSettingsMigration;
  window.isMigrationCompleted = isMigrationCompleted;
  window.getMigrationLog = getMigrationLog;
  window.resetMigrationFlag = resetMigrationFlag;
  
  // Auto-log instructions
  console.log('🔧 Migration functions available:');
  console.log('executeBusinessSettingsMigration() - Run migration');
  console.log('isMigrationCompleted() - Check if already migrated');
  console.log('getMigrationLog() - View migration log');
  console.log('resetMigrationFlag() - Reset for testing');
}

const executeMigrationModule = {
  executeBusinessSettingsMigration,
  isMigrationCompleted,
  getMigrationLog,
  resetMigrationFlag
};

export default executeMigrationModule;