/**
 * Create Test Data for Multi-Property Client Feature
 * Creates one parent company with four child properties for development testing
 */

import { initializeDatabase } from './database.js';

const createTestData = async () => {
  try {
    console.log('🏢 Creating test multi-property client data...');
    
    const db = await initializeDatabase();
    
    // Create the parent company
    console.log('📝 Creating parent company...');
    const parentCompanyData = {
      name: "Test Property Management LLC",
      address: "100 Business Center Dr, Sarasota, FL 34236",
      area: "Sarasota", 
      phone: "(555) 123-4567",
      email: "billing@testproperties.com",
      service_type: "Property Management Services",
      services: "Multi-property landscaping management",
      price: "Varies by property",
      payment_method: "Email Invoice",
      notes: "Parent company - bills for all child properties",
      status: "Active",
      client_type: "parent",
      created_date: new Date().toISOString().split('T')[0]
    };
    
    const parentResult = await db.execute(`
      INSERT INTO clients (
        name, address, area, phone, email, service_type, services,
        price, payment_method, notes, status, client_type, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parentCompanyData.name, parentCompanyData.address, parentCompanyData.area,
      parentCompanyData.phone, parentCompanyData.email, parentCompanyData.service_type,
      parentCompanyData.services, parentCompanyData.price, parentCompanyData.payment_method,
      parentCompanyData.notes, parentCompanyData.status, parentCompanyData.client_type,
      parentCompanyData.created_date
    ]);
    
    const parentId = parentResult.lastInsertRowid;
    console.log(`✅ Created parent company with ID: ${parentId}`);
    
    // Create child properties
    console.log('📝 Creating child properties...');
    const childProperties = [
      {
        name: "123 Oak Street Property",
        address: "123 Oak Street, Sarasota, FL 34231", 
        area: "Sarasota",
        phone: "(555) 123-4567", // Same as parent
        email: "billing@testproperties.com", // Same as parent
        service_type: "Bi-weekly Mowing",
        services: "Bi-weekly lawn mowing, edge trimming",
        price: "$45.00",
        payment_method: "Email Invoice",
        notes: "Front and back yard, small lot"
      },
      {
        name: "456 Pine Avenue Property", 
        address: "456 Pine Avenue, Nokomis, FL 34275",
        area: "Nokomis",
        phone: "(555) 123-4567",
        email: "billing@testproperties.com",
        service_type: "Weekly Mowing",
        services: "Weekly lawn mowing, hedge trimming monthly",
        price: "$65.00", 
        payment_method: "Email Invoice",
        notes: "Large corner lot, includes hedge maintenance"
      },
      {
        name: "789 Maple Drive Property",
        address: "789 Maple Drive, Osprey, FL 34229", 
        area: "Osprey",
        phone: "(555) 123-4567",
        email: "billing@testproperties.com", 
        service_type: "Bi-weekly Mowing",
        services: "Bi-weekly mowing, seasonal flower bed maintenance",
        price: "$55.00",
        payment_method: "Email Invoice", 
        notes: "Includes seasonal plantings and mulching"
      },
      {
        name: "321 Elm Court Property",
        address: "321 Elm Court, Bradenton, FL 34203",
        area: "Bradenton", 
        phone: "(555) 123-4567",
        email: "billing@testproperties.com",
        service_type: "Weekly Mowing", 
        services: "Weekly mowing, palm tree trimming quarterly",
        price: "$50.00",
        payment_method: "Email Invoice",
        notes: "Several palm trees, requires specialized equipment"
      }
    ];
    
    let childCount = 0;
    for (const property of childProperties) {
      const childResult = await db.execute(`
        INSERT INTO clients (
          name, address, area, phone, email, service_type, services,
          price, payment_method, notes, status, client_type, parent_company_id, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        property.name, property.address, property.area, property.phone, property.email,
        property.service_type, property.services, property.price, property.payment_method,
        property.notes, "Active", "child", parentId, new Date().toISOString().split('T')[0]
      ]);
      
      childCount++;
      console.log(`✅ Created child property: ${property.name} (ID: ${childResult.lastInsertRowid})`);
    }
    
    console.log(`🎉 Test data created successfully!`);
    console.log(`   - 1 parent company: Test Property Management LLC`);
    console.log(`   - ${childCount} child properties with varying service types and prices`);
    console.log(`   - All properties use the same billing contact and payment method`);
    
    return { parentId, childCount };
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
};

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData()
    .then(() => {
      console.log('🎉 Test data creation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test data creation failed:', error);
      process.exit(1);
    });
}

export { createTestData };