/**
 * Emergency Business Settings Migration Utility
 * Migrates localStorage business data to database for production safety
 * 
 * CRITICAL: This prevents permanent data loss from browser cache clears
 */

import { getBusinessSettings, updateBusinessSettings } from './database';
import { jasonBusinessData } from '../data/jasonData';

const DEBUG = process.env.REACT_APP_DEBUG_DATABASE === 'true';

/**
 * Migrates business settings from localStorage to database
 * This is a one-time operation to move Jason's configuration to cloud storage
 * 
 * @returns {Promise<Object>} Migration result with status and data
 */
export const migrateBusinessSettingsToDatabase = async () => {
  const migrationResult = {
    success: false,
    migrated: false,
    error: null,
    data: null,
    source: null
  };

  try {
    if (DEBUG) {
      console.log('🔄 Starting business settings migration...');
    }

    // Check if database already has business settings
    const existingDbSettings = await getBusinessSettings();
    if (existingDbSettings && existingDbSettings.name) {
      if (DEBUG) {
        console.log('✅ Database already has business settings, no migration needed');
      }
      migrationResult.success = true;
      migrationResult.migrated = false;
      migrationResult.data = existingDbSettings;
      migrationResult.source = 'database';
      return migrationResult;
    }

    // Try to get data from localStorage first
    let businessDataToMigrate = null;
    let dataSource = null;

    const storedData = localStorage.getItem('jasonBusinessData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData.businessInfo && parsedData.services && parsedData.paymentMethods) {
          businessDataToMigrate = parsedData;
          dataSource = 'localStorage';
          if (DEBUG) {
            console.log('📋 Found business data in localStorage for migration');
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse localStorage data:', parseError);
      }
    }

    // Fallback to default Jason's data if no localStorage data
    if (!businessDataToMigrate) {
      businessDataToMigrate = jasonBusinessData;
      dataSource = 'defaults';
      if (DEBUG) {
        console.log('📋 Using default Jason\'s business data for initial setup');
      }
    }

    // Prepare data for database format
    const businessSettingsForDb = {
      name: businessDataToMigrate.businessInfo.name,
      phone: businessDataToMigrate.businessInfo.phone,
      email: businessDataToMigrate.businessInfo.email,
      taxRate: businessDataToMigrate.businessInfo.taxRate || 0,
      serviceAreas: businessDataToMigrate.businessInfo.serviceAreas || [],
      services: businessDataToMigrate.services || [],
      paymentMethods: businessDataToMigrate.paymentMethods || []
    };

    if (DEBUG) {
      console.log('💾 Migrating business settings to database:', {
        name: businessSettingsForDb.name,
        serviceAreasCount: businessSettingsForDb.serviceAreas.length,
        servicesCount: businessSettingsForDb.services.length,
        paymentMethodsCount: businessSettingsForDb.paymentMethods.length,
        source: dataSource
      });
    }

    // Save to database
    const savedSettings = await updateBusinessSettings(businessSettingsForDb);

    if (DEBUG) {
      console.log('✅ Business settings successfully migrated to database');
    }

    migrationResult.success = true;
    migrationResult.migrated = true;
    migrationResult.data = savedSettings;
    migrationResult.source = dataSource;

    // Keep localStorage as backup cache
    const cacheData = {
      ...businessDataToMigrate,
      clients: [], // Clients are in database
      invoices: [] // Invoices are in database
    };
    localStorage.setItem('jasonBusinessData_backup', JSON.stringify(cacheData));

    return migrationResult;

  } catch (error) {
    console.error('❌ Business settings migration failed:', error);
    migrationResult.success = false;
    migrationResult.error = error.message;
    return migrationResult;
  }
};

/**
 * Loads business settings with fallback chain:
 * 1. Database (primary)
 * 2. localStorage (fallback)
 * 3. Default data (last resort)
 * 
 * @returns {Promise<Object>} Business settings data
 */
export const loadBusinessSettingsWithFallback = async () => {
  try {
    if (DEBUG) {
      console.log('🔍 Loading business settings with fallback chain...');
    }

    // Try database first (primary source)
    try {
      const dbSettings = await getBusinessSettings();
      if (dbSettings && dbSettings.name) {
        if (DEBUG) {
          console.log('✅ Loaded business settings from database');
        }
        return {
          success: true,
          data: {
            businessInfo: {
              name: dbSettings.name,
              phone: dbSettings.phone,
              email: dbSettings.email,
              taxRate: dbSettings.tax_rate || 0,
              serviceAreas: dbSettings.serviceAreas || []
            },
            services: dbSettings.services || [],
            paymentMethods: dbSettings.paymentMethods || []
          },
          source: 'database'
        };
      }
    } catch (dbError) {
      console.warn('⚠️ Database unavailable, trying fallback:', dbError);
    }

    // Fallback to localStorage
    const storedData = localStorage.getItem('jasonBusinessData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData.businessInfo) {
          if (DEBUG) {
            console.log('⚠️ Loaded business settings from localStorage fallback');
          }
          return {
            success: true,
            data: parsedData,
            source: 'localStorage'
          };
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse localStorage fallback:', parseError);
      }
    }

    // Last resort: default data
    if (DEBUG) {
      console.log('⚠️ Using default business data as last resort');
    }
    return {
      success: true,
      data: jasonBusinessData,
      source: 'defaults'
    };

  } catch (error) {
    console.error('❌ Failed to load business settings:', error);
    return {
      success: false,
      error: error.message,
      data: jasonBusinessData,
      source: 'error_fallback'
    };
  }
};

/**
 * Updates business settings in database with localStorage backup
 * 
 * @param {Object} settings - Business settings to update
 * @returns {Promise<Object>} Update result
 */
export const saveBusinessSettingsToDatabase = async (settings) => {
  try {
    if (DEBUG) {
      console.log('💾 Saving business settings to database...');
    }

    // Save to database (primary)
    const savedSettings = await updateBusinessSettings(settings);

    // Update localStorage cache
    const cacheData = {
      businessInfo: {
        name: settings.name,
        phone: settings.phone,
        email: settings.email,
        taxRate: settings.taxRate,
        serviceAreas: settings.serviceAreas
      },
      services: settings.services,
      paymentMethods: settings.paymentMethods,
      clients: [], // Don't cache clients
      invoices: [] // Don't cache invoices
    };
    localStorage.setItem('jasonBusinessData', JSON.stringify(cacheData));

    if (DEBUG) {
      console.log('✅ Business settings saved to database and cached');
    }

    return {
      success: true,
      data: savedSettings
    };

  } catch (error) {
    console.error('❌ Failed to save business settings:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const businessSettingsMigration = {
  migrateBusinessSettingsToDatabase,
  loadBusinessSettingsWithFallback,
  saveBusinessSettingsToDatabase
};

export default businessSettingsMigration;