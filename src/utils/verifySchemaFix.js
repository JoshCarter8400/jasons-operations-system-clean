/**
 * Verification script to check that the updated_at column fix has been applied
 * This checks the source code directly without requiring database access
 */

import fs from 'fs';
import path from 'path';

/**
 * Check if the updateServiceType function has been fixed
 */
function verifyServiceTypeUpdateFix() {
  console.log('🔍 Verifying Service Type Update Fix...');
  console.log('='.repeat(50));
  
  try {
    const databaseHelpersPath = path.join(process.cwd(), 'src', 'utils', 'databaseHelpers.js');
    const fileContent = fs.readFileSync(databaseHelpersPath, 'utf8');
    
    // Look for the updateServiceType function
    const updateServiceTypeFunctionMatch = fileContent.match(/export async function updateServiceType[\s\S]*?(?=export|$)/);
    
    if (!updateServiceTypeFunctionMatch) {
      console.log('❌ updateServiceType function not found');
      return false;
    }
    
    const functionCode = updateServiceTypeFunctionMatch[0];
    
    // Check for the problematic line
    const hasUpdatedAtReference = functionCode.includes('updated_at = CURRENT_TIMESTAMP');
    const hasUpdatedAtPush = functionCode.includes("updateFields.push('updated_at = CURRENT_TIMESTAMP')");
    
    console.log('📋 Function Analysis:');
    console.log(`  Function found: ✅`);
    console.log(`  Contains 'updated_at = CURRENT_TIMESTAMP': ${hasUpdatedAtReference ? '❌ (needs fix)' : '✅ (fixed)'}`);
    console.log(`  Contains updateFields.push('updated_at = CURRENT_TIMESTAMP'): ${hasUpdatedAtPush ? '❌ (needs fix)' : '✅ (fixed)'}`);
    
    // Check for proper parameter handling
    const hasProperParamPush = functionCode.includes('params.push(name)');
    console.log(`  Has proper parameter push: ${hasProperParamPush ? '✅' : '❌'}`);
    
    // Additional checks for the fix
    const hasCorrectFieldHandling = functionCode.includes('price_range = ?') && functionCode.includes('default_rate = ?');
    console.log(`  Handles correct database fields: ${hasCorrectFieldHandling ? '✅' : '❌'}`);
    
    // Check database schema for verification
    const schemaPath = path.join(process.cwd(), 'src', 'utils', 'database-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Check service_types table definition
      const serviceTypesTableMatch = schemaContent.match(/CREATE TABLE service_types \(([\s\S]*?)\);/);
      if (serviceTypesTableMatch) {
        const tableDefinition = serviceTypesTableMatch[1];
        const hasUpdatedAtColumn = tableDefinition.includes('updated_at');
        const hasCreatedAtColumn = tableDefinition.includes('created_at');
        
        console.log('\\n📊 Database Schema Analysis:');
        console.log(`  service_types table has created_at: ${hasCreatedAtColumn ? '✅' : '❌'}`);
        console.log(`  service_types table has updated_at: ${hasUpdatedAtColumn ? '❌ (should not have)' : '✅'}`);
        
        if (hasUpdatedAtColumn) {
          console.log('\\n⚠️ Schema Issue: service_types table should not have updated_at column');
          console.log('The table definition needs to match the actual database structure.');
        }
      }
      
      // Check business_settings table for comparison
      const businessSettingsMatch = schemaContent.match(/CREATE TABLE business_settings \(([\s\S]*?)\);/);
      if (businessSettingsMatch) {
        const businessTableDef = businessSettingsMatch[1];
        const businessHasUpdatedAt = businessTableDef.includes('updated_at');
        console.log(`  business_settings table has updated_at: ${businessHasUpdatedAt ? '✅ (correct)' : '❌'}`);
      }
    }
    
    const isFixed = !hasUpdatedAtReference && !hasUpdatedAtPush && hasProperParamPush && hasCorrectFieldHandling;
    
    console.log('\\n' + '='.repeat(50));
    if (isFixed) {
      console.log('🎉 SUCCESS: updateServiceType function has been properly fixed!');
      console.log('✅ No more references to updated_at column');
      console.log('✅ Proper parameter handling implemented');
      console.log('\\n🚀 The service update functionality should now work without SQLite errors.');
    } else {
      console.log('❌ ISSUE: updateServiceType function still needs fixes:');
      if (hasUpdatedAtReference || hasUpdatedAtPush) {
        console.log('  - Remove updated_at column references');
      }
      if (!hasProperParamPush) {
        console.log('  - Add proper parameter handling');
      }
    }
    console.log('='.repeat(50));
    
    return isFixed;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyServiceTypeUpdateFix();
}

export { verifyServiceTypeUpdateFix };