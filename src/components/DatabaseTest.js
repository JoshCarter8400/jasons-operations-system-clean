/**
 * Database Test Component
 * Simple React component to test database CRUD operations
 * This component can be temporarily added to verify database functionality
 */

import React, { useState } from 'react';
import {
  testConnection,
  getBusinessSettings,
  createClient,
  getClients,
  searchClients,
  getDatabaseStats
} from '../utils/database';

const DatabaseTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [stats, setStats] = useState(null);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: Date.now() }]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Connection
      addResult('Connection Test', 'info', 'Testing database connection...');
      const connected = await testConnection();
      setConnectionStatus(connected);
      addResult('Connection Test', connected ? 'success' : 'error', 
        connected ? 'Database connection successful' : 'Database connection failed');

      if (!connected) {
        addResult('Error', 'error', 'Cannot proceed with tests - no database connection');
        return;
      }

      // Test 2: Business Settings
      addResult('Business Settings', 'info', 'Testing business settings retrieval...');
      try {
        const businessSettings = await getBusinessSettings();
        addResult('Business Settings', 'success', 
          businessSettings ? `Retrieved: ${businessSettings.name || 'No name set'}` : 'No business settings found');
      } catch (error) {
        addResult('Business Settings', 'warning', `Business settings not initialized: ${error.message}`);
      }

      // Test 3: Client Operations
      addResult('Client Operations', 'info', 'Testing client operations...');
      try {
        const clients = await getClients();
        addResult('Client Operations', 'success', `Found ${clients.length} clients in database`);
        
        if (clients.length > 0) {
          // Test search functionality
          const searchResults = await searchClients('test');
          addResult('Search Test', 'success', `Search returned ${searchResults.length} results`);
        }
      } catch (error) {
        addResult('Client Operations', 'error', `Client operations failed: ${error.message}`);
      }

      // Test 4: Database Statistics
      addResult('Statistics', 'info', 'Getting database statistics...');
      try {
        const dbStats = await getDatabaseStats();
        setStats(dbStats);
        addResult('Statistics', 'success', 
          `Stats retrieved - Clients: ${dbStats.totalClients}, Invoices: ${dbStats.totalInvoices}`);
      } catch (error) {
        addResult('Statistics', 'error', `Statistics failed: ${error.message}`);
      }

      addResult('Complete', 'success', 'All tests completed successfully!');

    } catch (error) {
      addResult('Error', 'error', `Test suite failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestData = async () => {
    setIsLoading(true);
    addResult('Test Data', 'info', 'Creating test client...');
    
    try {
      const testClient = {
        name: 'Database Test Client',
        address: '123 Test Street, Test City',
        area: 'Test Area',
        phone: '(555) 000-0000',
        email: 'test@database.com',
        serviceType: 'Test Service',
        services: 'Database testing service',
        price: '$100/test',
        paymentMethod: 'Test Payment',
        notes: 'Created by database test component',
        status: 'Active',
        createdDate: new Date().toISOString().split('T')[0],
        nextService: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const newClient = await createClient(testClient);
      addResult('Test Data', 'success', `Created test client: ${newClient.name} (ID: ${newClient.id})`);
      
      // Refresh statistics
      const newStats = await getDatabaseStats();
      setStats(newStats);
      
    } catch (error) {
      addResult('Test Data', 'error', `Failed to create test data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚪';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🗄️ Database Test Dashboard</h2>
      <p>Test database connectivity and basic operations for Jason's Landscaping System</p>
      
      {/* Connection Status */}
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px', 
        backgroundColor: connectionStatus === true ? '#e8f5e8' : connectionStatus === false ? '#ffeaea' : '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '5px'
      }}>
        <strong>Connection Status:</strong> {
          connectionStatus === null ? '⏳ Not tested' :
          connectionStatus ? '✅ Connected' : '❌ Disconnected'
        }
      </div>

      {/* Database Statistics */}
      {stats && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          backgroundColor: '#f0f8ff',
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}>
          <h3>📊 Database Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div><strong>Total Clients:</strong> {stats.totalClients}</div>
            <div><strong>Active Clients:</strong> {stats.activeClients}</div>
            <div><strong>Total Invoices:</strong> {stats.totalInvoices}</div>
            <div><strong>Total Revenue:</strong> ${stats.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ Running Tests...' : '🚀 Run Database Tests'}
        </button>
        
        <button 
          onClick={createTestData}
          disabled={isLoading || connectionStatus !== true}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (isLoading || connectionStatus !== true) ? 'not-allowed' : 'pointer',
            opacity: (isLoading || connectionStatus !== true) ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ Creating...' : '📝 Create Test Data'}
        </button>
      </div>

      {/* Test Results */}
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '5px',
        backgroundColor: '#fafafa'
      }}>
        <h3 style={{ margin: '15px', marginBottom: '10px' }}>📋 Test Results</h3>
        
        {testResults.length === 0 ? (
          <p style={{ margin: '15px', color: '#666' }}>No tests run yet. Click "Run Database Tests" to begin.</p>
        ) : (
          <div style={{ padding: '0 15px 15px' }}>
            {testResults.map((result, index) => (
              <div 
                key={index}
                style={{
                  padding: '8px 12px',
                  marginBottom: '5px',
                  backgroundColor: 'white',
                  border: `1px solid ${getStatusColor(result.status)}`,
                  borderLeft: `4px solid ${getStatusColor(result.status)}`,
                  borderRadius: '3px',
                  fontSize: '14px'
                }}
              >
                <span style={{ marginRight: '8px' }}>{getStatusIcon(result.status)}</span>
                <strong>{result.test}:</strong> {result.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '5px'
      }}>
        <h4>📖 Instructions:</h4>
        <ol>
          <li><strong>Run Database Tests:</strong> Verify connection and basic operations</li>
          <li><strong>Create Test Data:</strong> Add sample client to test database functionality</li>
          <li><strong>Check Results:</strong> Review test output for any errors</li>
          <li><strong>Remove Component:</strong> Delete this component after testing is complete</li>
        </ol>
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <strong>Note:</strong> This is a temporary testing component. Remove it from production builds.
        </p>
      </div>
    </div>
  );
};

export default DatabaseTest;