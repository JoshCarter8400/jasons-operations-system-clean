/**
 * URGENT: Add address column to business_settings table
 * This script directly adds the missing address column
 */

import { createClient } from '@libsql/client';

/**
 * Immediately add address column to business_settings table
 */
export async function urgentAddAddressColumn() {
  console.log('🚨 URGENT: Adding address column to business_settings table...');
  
  try {
    const config = {
      url: process.env.REACT_APP_TURSO_DATABASE_URL || '',
      authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN || ''
    };
    
    if (!config.url) {
      throw new Error('Database URL not configured');
    }

    const db = createClient(config);
    
    // Check current table structure
    console.log('📋 Checking current table structure...');
    const tableInfo = await db.execute(`PRAGMA table_info(business_settings)`);
    
    console.log('Current columns:', tableInfo.rows.map(row => `${row.name} (${row.type})`));
    
    const hasAddress = tableInfo.rows.some(row => row.name === 'address');
    
    if (hasAddress) {
      console.log('✅ Address column already exists!');
      return { success: true, message: 'Address column already exists' };
    }
    
    // Add the address column
    console.log('🔧 Adding address column...');
    await db.execute(`
      ALTER TABLE business_settings 
      ADD COLUMN address TEXT DEFAULT ''
    `);
    
    console.log('✅ Address column added successfully!');
    
    // Verify the column was added
    const updatedInfo = await db.execute(`PRAGMA table_info(business_settings)`);
    const addressColumn = updatedInfo.rows.find(row => row.name === 'address');
    
    if (addressColumn) {
      console.log('✅ Verification successful - address column exists');
      console.log(`Column details: ${addressColumn.name} ${addressColumn.type} (default: ${addressColumn.dflt_value})`);
      
      // Test updating a record with address
      console.log('🧪 Testing address field update...');
      await db.execute(`
        UPDATE business_settings 
        SET address = 'Test Address', updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `);
      
      // Read it back
      const testRead = await db.execute(`SELECT address FROM business_settings WHERE id = 1`);
      if (testRead.rows.length > 0) {
        console.log('✅ Address field test successful:', testRead.rows[0].address);
      }
      
      return { 
        success: true, 
        message: 'Address column added and tested successfully',
        columnInfo: addressColumn 
      };
    } else {
      throw new Error('Address column was not found after ALTER TABLE');
    }
    
  } catch (error) {
    console.error('❌ Failed to add address column:', error);
    return { 
      success: false, 
      error: error.message,
      details: error 
    };
  }
}

// Test the business settings update with address
export async function testBusinessSettingsWithAddress() {
  console.log('🧪 Testing updateBusinessSettings with address...');
  
  try {
    const config = {
      url: process.env.REACT_APP_TURSO_DATABASE_URL || '',
      authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN || ''
    };
    
    const db = createClient(config);
    
    // Test the complete update operation
    const testSettings = {
      name: 'Trusting and Affordable Tree Service and Lawn Care',
      phone: '516-580-1223',
      email: 'Trustingandaffordabletrees@gmail.com',
      address: '123 Business Street, Sarasota, FL 34231',
      taxRate: 0.0
    };
    
    console.log('📝 Testing complete business settings update...');
    
    await db.execute(`
      INSERT INTO business_settings (id, name, phone, email, address, tax_rate)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        tax_rate = excluded.tax_rate,
        updated_at = CURRENT_TIMESTAMP
    `, [testSettings.name, testSettings.phone, testSettings.email, testSettings.address, testSettings.taxRate]);
    
    // Read back the settings
    const result = await db.execute(`
      SELECT name, phone, email, address, tax_rate 
      FROM business_settings 
      WHERE id = 1
    `);
    
    if (result.rows.length > 0) {
      const settings = result.rows[0];
      console.log('✅ Business settings update test successful:');
      console.log(`  Name: ${settings.name}`);
      console.log(`  Phone: ${settings.phone}`);
      console.log(`  Email: ${settings.email}`);
      console.log(`  Address: ${settings.address}`);
      console.log(`  Tax Rate: ${settings.tax_rate}`);
      
      return { success: true, settings };
    } else {
      throw new Error('No business settings found after update');
    }
    
  } catch (error) {
    console.error('❌ Business settings test failed:', error);
    return { success: false, error: error.message };
  }
}

// Make functions available globally for browser
if (typeof window !== 'undefined') {
  window.urgentAddAddressColumn = urgentAddAddressColumn;
  window.testBusinessSettingsWithAddress = testBusinessSettingsWithAddress;
  
  console.log('🚨 URGENT ADDRESS COLUMN FIX AVAILABLE:');
  console.log('  urgentAddAddressColumn() - Add the missing address column');
  console.log('  testBusinessSettingsWithAddress() - Test address functionality');
}

export { urgentAddAddressColumn as default };