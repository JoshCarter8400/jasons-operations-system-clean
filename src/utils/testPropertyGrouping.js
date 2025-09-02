/**
 * Test Property Grouping Logic
 * Validates the property-grouped invoice display functionality
 */

import { 
  extractPropertyName, 
  shouldUsePropertyGrouping, 
  groupLineItemsByProperty,
  cleanServiceDescription 
} from './propertyGrouping.js';

const testPropertyGrouping = () => {
  console.log('🧪 Testing Property Grouping Logic');
  console.log('==================================');
  console.log('');

  // Test 1: Extract Property Names
  console.log('📋 Test 1: Extracting Property Names');
  const testDescriptions = [
    'Weekly Mowing (TESTING - Josh Carter)',
    'Weekly Mowing (321 Elm Court Property)',
    'Hedge Trimming (Mike\'s Property)',
    'Tree Trimming', // No property name
    'Pressure Washing (North Venice Apartments)'
  ];

  testDescriptions.forEach(desc => {
    const propertyName = extractPropertyName(desc);
    const cleanDesc = cleanServiceDescription(desc);
    console.log(`   "${desc}" → Property: "${propertyName || 'None'}" → Clean: "${cleanDesc}"`);
  });
  console.log('');

  // Test 2: Should Use Property Grouping
  console.log('📊 Test 2: Detection Logic');
  
  const parentClient = { id: 90, client_type: 'parent', name: 'Test Property Management LLC' };
  const individualClient = { id: 61, client_type: 'individual', name: 'Individual Client' };
  
  const lineItemsWithProperties = [
    { id: 1, description: 'Weekly Mowing (Property A)', quantity: 1, rate: 50.00 },
    { id: 2, description: 'Weekly Mowing (Property B)', quantity: 1, rate: 75.00 }
  ];
  
  const lineItemsWithoutProperties = [
    { id: 1, description: 'Weekly Mowing', quantity: 1, rate: 50.00 },
    { id: 2, description: 'Hedge Trimming', quantity: 1, rate: 75.00 }
  ];

  console.log(`   Parent Client + Property Items: ${shouldUsePropertyGrouping(parentClient, lineItemsWithProperties)}`);
  console.log(`   Parent Client + Normal Items: ${shouldUsePropertyGrouping(parentClient, lineItemsWithoutProperties)}`);
  console.log(`   Individual Client + Property Items: ${shouldUsePropertyGrouping(individualClient, lineItemsWithProperties)}`);
  console.log(`   Individual Client + Normal Items: ${shouldUsePropertyGrouping(individualClient, lineItemsWithoutProperties)}`);
  console.log('');

  // Test 3: Property Grouping
  console.log('🏠 Test 3: Property Grouping');
  
  const testLineItems = [
    { id: 1, description: 'Weekly Mowing (TESTING - Josh Carter)', quantity: 1, rate: 150.00 },
    { id: 2, description: 'Weekly Mowing (TESTING - Josh Carter)', quantity: 1, rate: 500.00 },
    { id: 3, description: 'Weekly Mowing (321 Elm Court Property)', quantity: 1, rate: 50.00 },
    { id: 4, description: 'Hedge Trimming (Mike\'s Property)', quantity: 2, rate: 75.00 },
    { id: 5, description: 'Tree Trimming', quantity: 1, rate: 200.00 } // No property
  ];

  const grouped = groupLineItemsByProperty(testLineItems);
  
  Object.values(grouped.groups).forEach(group => {
    console.log(`   === ${group.propertyName} ===`);
    group.items.forEach(item => {
      const cleanDesc = cleanServiceDescription(item.description);
      console.log(`      - ${cleanDesc} - $${item.itemAmount.toFixed(2)}`);
    });
    console.log(`      Property Subtotal: $${group.subtotal.toFixed(2)}`);
    console.log('');
  });

  console.log(`   TOTAL FOR ALL PROPERTIES: $${grouped.totalAmount.toFixed(2)}`);
  console.log('');

  // Expected Results Summary
  console.log('✅ Expected Results:');
  console.log('   - Parent companies should use property grouping');
  console.log('   - Individual clients should use flat display');
  console.log('   - Services grouped by property name extracted from description');
  console.log('   - Property subtotals calculated correctly');
  console.log('   - Total for all properties shown');
  console.log('   - Service descriptions cleaned (property names removed)');
  console.log('');
  
  console.log('🧪 Property Grouping Logic Test Complete!');
  console.log('Ready for manual testing in the browser at:');
  console.log('   Parent Company: http://localhost:3000/invoicing/collecting/90');
  console.log('   Individual Client: http://localhost:3000/invoicing/collecting/61');
  
  return {
    extractPropertyName,
    shouldUsePropertyGrouping,
    groupLineItemsByProperty,
    testResults: grouped
  };
};

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPropertyGrouping();
}

export { testPropertyGrouping };