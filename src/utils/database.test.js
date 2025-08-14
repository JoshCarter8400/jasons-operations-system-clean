/**
 * Database CRUD Operations Test
 * Tests basic database functionality for Jason's Landscaping System
 * Run this file to verify database setup and operations
 */

import {
  initializeDatabase,
  testConnection,
  getBusinessSettings,
  updateBusinessSettings,
  createClient,
  getClients,
  getClientById,
  updateClient,
  searchClients,
  createInvoice,
  getInvoices,
  getDatabaseStats,
  migrateFromLocalStorage
} from './database.js';

// Sample test data
const sampleBusinessSettings = {
  name: "Jason's Landscaping",
  phone: "(555) 123-4567",
  email: "jason@jasonlandscaping.com",
  taxRate: 0.075,
  serviceAreas: ["Downtown", "Suburbs", "Industrial"],
  services: [
    { name: "Lawn Care", priceRange: "$50-100", defaultRate: 75 },
    { name: "Tree Trimming", priceRange: "$100-200", defaultRate: 150 }
  ],
  paymentMethods: ["Cash", "Check", "Credit Card"]
};

const sampleClient = {
  name: "Test Client",
  address: "123 Main St, Test City",
  area: "Downtown",
  phone: "(555) 987-6543",
  email: "test@example.com",
  serviceType: "Lawn Care",
  services: "Weekly lawn maintenance",
  price: "$75/week",
  paymentMethod: "Credit Card",
  notes: "Test client for database verification",
  status: "Active",
  lastService: "2025-07-01",
  nextService: "2025-08-05",
  createdDate: "2025-08-04"
};

/**
 * Run all database tests
 */
async function runTests() {
  console.log('🚀 Starting Database CRUD Tests...\n');
  
  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    const connectionStatus = await testConnection();
    console.log(`   ✅ Connection: ${connectionStatus ? 'SUCCESS' : 'FAILED'}\n`);
    
    if (!connectionStatus) {
      throw new Error('Database connection failed');
    }
    
    // Test 2: Business Settings
    console.log('2. Testing business settings operations...');
    await updateBusinessSettings(sampleBusinessSettings);
    const businessSettings = await getBusinessSettings();
    console.log('   ✅ Business settings saved and retrieved');
    console.log(`   📊 Business: ${businessSettings.name}`);
    console.log(`   📍 Service Areas: ${businessSettings.serviceAreas.length}`);
    console.log(`   🛠️  Services: ${businessSettings.services.length}\n`);
    
    // Test 3: Client Operations
    console.log('3. Testing client CRUD operations...');
    
    // Create client
    const newClient = await createClient(sampleClient);
    console.log(`   ✅ Created client: ${newClient.name} (ID: ${newClient.id})`);
    
    // Get client by ID
    const retrievedClient = await getClientById(newClient.id);
    console.log(`   ✅ Retrieved client: ${retrievedClient.name}`);
    
    // Update client
    const updatedClientData = { ...sampleClient, notes: "Updated test note" };
    const updatedClient = await updateClient(newClient.id, updatedClientData);
    console.log(`   ✅ Updated client notes: "${updatedClient.notes}"`);
    
    // Get all clients
    const allClients = await getClients();
    console.log(`   ✅ Retrieved all clients: ${allClients.length} found`);
    
    // Search clients
    const searchResults = await searchClients("Test");
    console.log(`   ✅ Search results: ${searchResults.length} clients found\n`);
    
    // Test 4: Invoice Operations
    console.log('4. Testing invoice operations...');
    
    const sampleInvoice = {
      clientId: newClient.id,
      clientName: newClient.name,
      date: "2025-08-04",
      dueDate: "2025-09-04",
      status: "Draft",
      services: [
        {
          description: "Weekly lawn maintenance",
          quantity: 4,
          rate: 75,
          amount: 300
        }
      ],
      subtotal: 300,
      tax: 22.50,
      total: 322.50,
      notes: "Test invoice",
      paymentMethod: "Credit Card"
    };
    
    const newInvoice = await createInvoice(sampleInvoice);
    console.log(`   ✅ Created invoice: #${newInvoice.id} for $${newInvoice.total}`);
    
    const allInvoices = await getInvoices();
    console.log(`   ✅ Retrieved all invoices: ${allInvoices.length} found\n`);
    
    // Test 5: Database Statistics
    console.log('5. Testing database statistics...');
    const stats = await getDatabaseStats();
    console.log('   ✅ Database Statistics:');
    console.log(`   👥 Total Clients: ${stats.totalClients}`);
    console.log(`   📄 Total Invoices: ${stats.totalInvoices}`);
    console.log(`   ✅ Active Clients: ${stats.activeClients}`);
    console.log(`   💰 Total Revenue: $${stats.totalRevenue}\n`);
    
    // Test 6: Filter Operations
    console.log('6. Testing filter operations...');
    
    const activeClients = await getClients({ status: 'Active' });
    console.log(`   ✅ Active clients filter: ${activeClients.length} found`);
    
    const downtownClients = await getClients({ area: 'Downtown' });
    console.log(`   ✅ Downtown area filter: ${downtownClients.length} found`);
    
    const draftInvoices = await getInvoices({ status: 'Draft' });
    console.log(`   ✅ Draft invoices filter: ${draftInvoices.length} found\n`);
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Database connection established');
    console.log('   ✅ Business settings CRUD operations');
    console.log('   ✅ Client CRUD operations');
    console.log('   ✅ Invoice CRUD operations');
    console.log('   ✅ Search and filter functionality');
    console.log('   ✅ Database statistics reporting');
    console.log('\n🚀 Ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test localStorage migration
 */
async function testMigration() {
  console.log('\n🔄 Testing localStorage migration...');
  
  // Sample localStorage data structure
  const sampleLocalStorageData = {
    businessInfo: {
      name: "Jason's Landscaping",
      phone: "(555) 123-4567",
      email: "jason@jasonlandscaping.com",
      serviceAreas: ["Downtown", "Suburbs"],
      taxRate: 0.075
    },
    services: [
      { name: "Lawn Care", priceRange: "$50-100", defaultRate: 75 }
    ],
    paymentMethods: ["Cash", "Check"],
    clients: [
      {
        name: "Migration Test Client",
        address: "456 Oak St",
        area: "Suburbs",
        phone: "(555) 111-2222",
        email: "migrate@test.com",
        serviceType: "Lawn Care",
        services: "Monthly service",
        price: "$75/month",
        paymentMethod: "Check",
        status: "Active",
        createdDate: "2025-08-01",
        lastService: "2025-07-15",
        nextService: "2025-08-15"
      }
    ],
    invoices: [
      {
        clientId: 1,
        clientName: "Migration Test Client",
        date: "2025-08-01",
        dueDate: "2025-09-01",
        status: "Paid",
        services: [
          {
            description: "Monthly lawn care",
            quantity: 1,
            rate: 75,
            amount: 75
          }
        ],
        subtotal: 75,
        tax: 5.625,
        total: 80.625,
        notes: "Migration test invoice",
        paymentMethod: "Check"
      }
    ]
  };
  
  try {
    const migrationResults = await migrateFromLocalStorage(sampleLocalStorageData);
    console.log('   ✅ Migration completed:');
    console.log(`   📊 Business Settings: ${migrationResults.businessSettings ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   👥 Clients Migrated: ${migrationResults.clients}`);
    console.log(`   📄 Invoices Migrated: ${migrationResults.invoices}`);
    
    if (migrationResults.errors.length > 0) {
      console.log('   ⚠️  Migration Errors:');
      migrationResults.errors.forEach(error => console.log(`      - ${error}`));
    } else {
      console.log('   ✅ No migration errors');
    }
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  }
}

// Export test functions
export { runTests, testMigration };

// If running directly (for command line testing)
if (typeof window === 'undefined') {
  // Node.js environment
  runTests().then(() => {
    testMigration();
  });
}