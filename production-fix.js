#!/usr/bin/env node
/**
 * Production Fix Script
 * 
 * This script diagnoses and fixes the production crash issue.
 * It checks database connectivity and ensures business settings exist.
 */

import { initializeDatabase, testConnection } from './src/utils/database.js';
import { getAllBusinessSettingsData } from './src/utils/databaseHelpers.js';
import { executeBusinessSettingsMigration, isMigrationCompleted } from './src/utils/executeMigration.js';
import { jasonBusinessData } from './src/data/jasonData.js';

console.log('🚀 Production Fix Script Started');
console.log('=' .repeat(50));

async function checkDatabaseConnection() {
  console.log('\n📡 Step 1: Checking database connection...');
  try {
    const connection = await testConnection();
    if (connection.success) {
      console.log('✅ Database connection successful');
      console.log(`   Database URL: ${connection.url}`);
      return true;
    } else {
      console.log('❌ Database connection failed');
      console.log(`   Error: ${connection.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection failed with exception');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkBusinessSettings() {
  console.log('\n📊 Step 2: Checking business settings...');
  try {
    const settings = await getAllBusinessSettingsData();
    
    console.log('Business Settings Status:');
    console.log(`   Business Info: ${settings.businessInfo ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   Service Areas: ${settings.serviceAreas?.length || 0} items`);
    console.log(`   Services: ${settings.services?.length || 0} items`);
    console.log(`   Payment Methods: ${settings.paymentMethods?.length || 0} items`);
    
    if (settings.businessInfo && 
        settings.serviceAreas?.length > 0 && 
        settings.services?.length > 0 && 
        settings.paymentMethods?.length > 0) {
      console.log('✅ Business settings are complete');
      return true;
    } else {
      console.log('❌ Business settings are incomplete or missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to check business settings');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runMigrationIfNeeded() {
  console.log('\n🔄 Step 3: Running migration if needed...');
  
  try {
    if (isMigrationCompleted()) {
      console.log('ℹ️ Migration already completed, skipping');
      return true;
    }
    
    console.log('🚀 Running business settings migration...');
    const result = await executeBusinessSettingsMigration();
    
    if (result.success) {
      console.log('✅ Migration completed successfully');
      return true;
    } else {
      console.log('❌ Migration failed');
      console.log(`   Errors: ${result.errors.map(e => e.error).join(', ')}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Migration failed with exception');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function verifyFinalState() {
  console.log('\n✅ Step 4: Verifying final state...');
  
  const settingsCheck = await checkBusinessSettings();
  
  if (settingsCheck) {
    console.log('🎉 Production fix completed successfully!');
    console.log('   App should now load without crashes');
    return true;
  } else {
    console.log('⚠️ Business settings still incomplete');
    console.log('   App may still crash - manual intervention required');
    return false;
  }
}

async function main() {
  try {
    // Initialize database first
    console.log('🔧 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    const step1 = await checkDatabaseConnection();
    if (!step1) {
      console.log('\n❌ CRITICAL: Database connection failed');
      console.log('   Check environment variables:');
      console.log(`   REACT_APP_TURSO_DATABASE_URL: ${process.env.REACT_APP_TURSO_DATABASE_URL ? 'SET' : 'MISSING'}`);
      console.log(`   REACT_APP_TURSO_AUTH_TOKEN: ${process.env.REACT_APP_TURSO_AUTH_TOKEN ? 'SET' : 'MISSING'}`);
      process.exit(1);
    }
    
    const step2 = await checkBusinessSettings();
    
    if (!step2) {
      const step3 = await runMigrationIfNeeded();
      if (!step3) {
        console.log('\n❌ CRITICAL: Migration failed');
        console.log('   Manual database setup required');
        process.exit(1);
      }
    }
    
    const finalCheck = await verifyFinalState();
    if (finalCheck) {
      console.log('\n🎉 SUCCESS: Production fix completed!');
      process.exit(0);
    } else {
      console.log('\n⚠️ WARNING: Issues remain, manual intervention needed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 SCRIPT FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();