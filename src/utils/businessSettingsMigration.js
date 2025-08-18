/**
 * Business Settings Migration Utility
 * 
 * This utility prepares business settings data from localStorage for migration to database.
 * It reads current localStorage structure and creates SQL statements for insertion.
 * 
 * IMPORTANT: This is a PREPARATION utility only - it does NOT execute any database changes.
 * The actual migration should be executed manually after review.
 */

import { jasonBusinessData } from '../data/jasonData.js';

/**
 * Reads current business settings from localStorage
 * @returns {Object} Current business settings structure
 */
export function getCurrentBusinessSettingsFromStorage() {
  try {
    const stored = localStorage.getItem('jasonBusinessData');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        businessInfo: parsed.businessInfo || jasonBusinessData.businessInfo,
        services: parsed.services || jasonBusinessData.services,
        paymentMethods: parsed.paymentMethods || jasonBusinessData.paymentMethods,
        serviceAreas: parsed.businessInfo?.serviceAreas || jasonBusinessData.businessInfo.serviceAreas
      };
    }
    
    // Fallback to default data
    return {
      businessInfo: jasonBusinessData.businessInfo,
      services: jasonBusinessData.services,
      paymentMethods: jasonBusinessData.paymentMethods,
      serviceAreas: jasonBusinessData.businessInfo.serviceAreas
    };
  } catch (error) {
    console.error('Error reading business settings from localStorage:', error);
    // Return default data on error
    return {
      businessInfo: jasonBusinessData.businessInfo,
      services: jasonBusinessData.services,
      paymentMethods: jasonBusinessData.paymentMethods,
      serviceAreas: jasonBusinessData.businessInfo.serviceAreas
    };
  }
}

/**
 * Prepares business_settings table INSERT statement
 * @param {Object} businessInfo - Business information from localStorage
 * @returns {Object} SQL statement and parameters
 */
export function prepareBusinessSettingsInsert(businessInfo) {
  const sql = `
    INSERT INTO business_settings (id, name, phone, email, tax_rate)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      tax_rate = excluded.tax_rate,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  const params = [
    businessInfo.name,
    businessInfo.phone,
    businessInfo.email,
    businessInfo.taxRate || 0.0
  ];
  
  return { sql, params };
}

/**
 * Prepares service_areas table INSERT statements
 * @param {Array} serviceAreas - Array of service area names
 * @returns {Array} Array of SQL statements and parameters
 */
export function prepareServiceAreasInserts(serviceAreas) {
  return serviceAreas.map((areaName, index) => ({
    sql: `
      INSERT INTO service_areas (area_name, active)
      VALUES (?, true)
      ON CONFLICT (area_name) DO UPDATE SET
        active = true,
        created_at = COALESCE(service_areas.created_at, CURRENT_TIMESTAMP)
    `,
    params: [areaName]
  }));
}

/**
 * Prepares service_types table INSERT statements
 * @param {Array} services - Array of service objects from localStorage
 * @returns {Array} Array of SQL statements and parameters
 */
export function prepareServiceTypesInserts(services) {
  return services.map(service => ({
    sql: `
      INSERT INTO service_types (name, price_range, default_rate, active)
      VALUES (?, ?, ?, true)
      ON CONFLICT (name) DO UPDATE SET
        price_range = excluded.price_range,
        default_rate = excluded.default_rate,
        active = true,
        created_at = COALESCE(service_types.created_at, CURRENT_TIMESTAMP)
    `,
    params: [
      service.name,
      service.priceRange,
      service.defaultRate
    ]
  }));
}

/**
 * Prepares payment_methods table INSERT statements
 * @param {Array} paymentMethods - Array of payment method strings
 * @returns {Array} Array of SQL statements and parameters
 */
export function preparePaymentMethodsInserts(paymentMethods) {
  return paymentMethods.map(method => ({
    sql: `
      INSERT INTO payment_methods (method_name, active)
      VALUES (?, true)
      ON CONFLICT (method_name) DO UPDATE SET
        active = true,
        created_at = COALESCE(payment_methods.created_at, CURRENT_TIMESTAMP)
    `,
    params: [method]
  }));
}

/**
 * Generates complete migration plan with all SQL statements
 * This function reads localStorage and prepares all necessary SQL statements
 * @returns {Object} Complete migration plan
 */
export function generateBusinessSettingsMigrationPlan() {
  const currentData = getCurrentBusinessSettingsFromStorage();
  
  const plan = {
    description: 'Business Settings Migration Plan - localStorage to Database',
    timestamp: new Date().toISOString(),
    currentData,
    statements: []
  };
  
  // Business settings (single row)
  plan.statements.push({
    table: 'business_settings',
    operation: 'UPSERT',
    ...prepareBusinessSettingsInsert(currentData.businessInfo)
  });
  
  // Service areas (multiple rows)
  const serviceAreaStatements = prepareServiceAreasInserts(currentData.serviceAreas);
  serviceAreaStatements.forEach((stmt, idx) => {
    plan.statements.push({
      table: 'service_areas',
      operation: 'UPSERT',
      description: `Insert service area: ${currentData.serviceAreas[idx]}`,
      ...stmt
    });
  });
  
  // Service types (multiple rows)
  const serviceTypeStatements = prepareServiceTypesInserts(currentData.services);
  serviceTypeStatements.forEach((stmt, index) => {
    plan.statements.push({
      table: 'service_types',
      operation: 'UPSERT',
      description: `Insert service type: ${currentData.services[index].name}`,
      ...stmt
    });
  });
  
  // Payment methods (multiple rows)
  const paymentMethodStatements = preparePaymentMethodsInserts(currentData.paymentMethods);
  paymentMethodStatements.forEach((stmt, index) => {
    plan.statements.push({
      table: 'payment_methods',
      operation: 'UPSERT',
      description: `Insert payment method: ${currentData.paymentMethods[index]}`,
      ...stmt
    });
  });
  
  return plan;
}

/**
 * Validates business settings data before migration
 * @param {Object} businessSettings - Business settings from localStorage
 * @returns {Object} Validation result with any issues found
 */
export function validateBusinessSettingsForMigration(businessSettings) {
  const issues = [];
  const warnings = [];
  
  // Validate business info
  if (!businessSettings.businessInfo?.name) {
    issues.push('Business name is required');
  }
  if (!businessSettings.businessInfo?.phone) {
    issues.push('Business phone is required');
  }
  if (!businessSettings.businessInfo?.email) {
    issues.push('Business email is required');
  }
  
  // Validate service areas
  if (!businessSettings.serviceAreas || businessSettings.serviceAreas.length === 0) {
    warnings.push('No service areas found');
  } else {
    const duplicateAreas = businessSettings.serviceAreas.filter((area, index) => 
      businessSettings.serviceAreas.indexOf(area) !== index
    );
    if (duplicateAreas.length > 0) {
      warnings.push(`Duplicate service areas found: ${duplicateAreas.join(', ')}`);
    }
  }
  
  // Validate services
  if (!businessSettings.services || businessSettings.services.length === 0) {
    warnings.push('No services found');
  } else {
    businessSettings.services.forEach((service, index) => {
      if (!service.name) {
        issues.push(`Service at index ${index} missing name`);
      }
      if (!service.defaultRate || service.defaultRate <= 0) {
        warnings.push(`Service "${service.name}" has no default rate`);
      }
    });
  }
  
  // Validate payment methods
  if (!businessSettings.paymentMethods || businessSettings.paymentMethods.length === 0) {
    warnings.push('No payment methods found');
  } else {
    const duplicateMethods = businessSettings.paymentMethods.filter((method, index) => 
      businessSettings.paymentMethods.indexOf(method) !== index
    );
    if (duplicateMethods.length > 0) {
      warnings.push(`Duplicate payment methods found: ${duplicateMethods.join(', ')}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    summary: {
      businessInfo: !!businessSettings.businessInfo,
      serviceAreasCount: businessSettings.serviceAreas?.length || 0,
      servicesCount: businessSettings.services?.length || 0,
      paymentMethodsCount: businessSettings.paymentMethods?.length || 0
    }
  };
}

/**
 * Utility function to display migration plan in a readable format
 * @param {Object} plan - Migration plan from generateBusinessSettingsMigrationPlan()
 * @returns {string} Formatted migration plan
 */
export function formatMigrationPlan(plan) {
  let output = [];
  
  output.push('='.repeat(60));
  output.push(`Business Settings Migration Plan`);
  output.push(`Generated: ${plan.timestamp}`);
  output.push('='.repeat(60));
  output.push('');
  
  output.push('CURRENT LOCALSTORAGE DATA:');
  output.push(`Business Name: ${plan.currentData.businessInfo.name}`);
  output.push(`Business Phone: ${plan.currentData.businessInfo.phone}`);
  output.push(`Business Email: ${plan.currentData.businessInfo.email}`);
  output.push(`Tax Rate: ${plan.currentData.businessInfo.taxRate}`);
  output.push(`Service Areas (${plan.currentData.serviceAreas.length}): ${plan.currentData.serviceAreas.join(', ')}`);
  output.push(`Services (${plan.currentData.services.length}): ${plan.currentData.services.map(s => s.name).join(', ')}`);
  output.push(`Payment Methods (${plan.currentData.paymentMethods.length}): ${plan.currentData.paymentMethods.join(', ')}`);
  output.push('');
  
  output.push(`MIGRATION STATEMENTS (${plan.statements.length} total):`);
  plan.statements.forEach((stmt, index) => {
    output.push(`${index + 1}. ${stmt.table.toUpperCase()} - ${stmt.operation}`);
    if (stmt.description) {
      output.push(`   Description: ${stmt.description}`);
    }
    output.push(`   SQL: ${stmt.sql.replace(/\s+/g, ' ').trim()}`);
    output.push(`   Params: ${JSON.stringify(stmt.params)}`);
    output.push('');
  });
  
  return output.join('\n');
}

const businessSettingsMigration = {
  getCurrentBusinessSettingsFromStorage,
  prepareBusinessSettingsInsert,
  prepareServiceAreasInserts,
  prepareServiceTypesInserts,
  preparePaymentMethodsInserts,
  generateBusinessSettingsMigrationPlan,
  validateBusinessSettingsForMigration,
  formatMigrationPlan
};

export default businessSettingsMigration;