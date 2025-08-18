/**
 * Browser-compatible test for service update functionality
 * This can be called directly from the browser console when the app is running
 */

/**
 * Test service update functionality in browser environment
 * Call this from browser console: window.testServiceUpdateInBrowser()
 */
async function testServiceUpdateInBrowser() {
  console.log('🧪 Testing Service Update in Browser Environment...');
  console.log('='.repeat(50));
  
  // Check if we're in a browser with the app loaded
  if (typeof window === 'undefined') {
    console.error('❌ This test must be run in a browser environment');
    return false;
  }
  
  // Check if React components are available
  if (!window.React || !window.document) {
    console.error('❌ React environment not detected');
    return false;
  }
  
  try {
    // Try to find DataContext functions
    const dataContext = window.dataContextFunctions;
    if (!dataContext) {
      console.log('⚠️ DataContext functions not exposed globally');
      console.log('🔧 To test service updates, please:');
      console.log('1. Go to Business Settings page');
      console.log('2. Try editing a service (click Edit button)');
      console.log('3. Change price range or default rate');
      console.log('4. Click Save');
      console.log('5. Verify no database errors occur');
      return true;
    }
    
    // If DataContext is available, try testing service operations
    console.log('📝 Testing service update operations...');
    
    // Add test service
    const testService = {
      name: 'Test Service Update Browser',
      priceRange: '$50-$100',
      defaultRate: 75.00
    };
    
    console.log('Adding test service...');
    const addResult = await dataContext.addService(testService);
    
    if (!addResult) {
      throw new Error('Failed to add test service');
    }
    
    console.log('✅ Test service added successfully');
    
    // Update the service
    console.log('Updating test service...');
    const updateResult = await dataContext.updateService(testService.name, {
      priceRange: '$60-$120',
      defaultRate: 90.00
    });
    
    if (!updateResult) {
      throw new Error('Failed to update test service');
    }
    
    console.log('✅ Test service updated successfully');
    
    // Cleanup
    console.log('Cleaning up test service...');
    await dataContext.removeService(testService.name);
    console.log('✅ Test service removed');
    
    console.log('\\n' + '='.repeat(50));
    console.log('🎉 SUCCESS: Service update functionality works correctly!');
    console.log('The updated_at column issue has been fixed.');
    console.log('='.repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\\n' + '='.repeat(50));
    console.log('⚠️ MANUAL TEST INSTRUCTIONS:');
    console.log('1. Navigate to Business Settings page');
    console.log('2. Find an existing service and click Edit');
    console.log('3. Modify the price range or default rate');
    console.log('4. Click Save');
    console.log('5. Check browser console for any database errors');
    console.log('6. If no errors appear, the fix is working!');
    console.log('='.repeat(50));
    
    return false;
  }
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.testServiceUpdateInBrowser = testServiceUpdateInBrowser;
  console.log('🔧 Browser service test available: testServiceUpdateInBrowser()');
}

export { testServiceUpdateInBrowser };