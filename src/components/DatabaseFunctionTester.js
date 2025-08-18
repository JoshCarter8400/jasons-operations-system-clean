import React, { useState } from 'react';
import { runCompleteTestSuite, runReadOnlyTests, runWriteTests, testErrorHandling, cleanupBrowserTests } from '../utils/browserTestRunner';

const DatabaseFunctionTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const runTest = async (testFunction, testName) => {
    setIsRunning(true);
    console.log(`\n🚀 Starting ${testName}...`);
    
    try {
      const result = await testFunction();
      setLastResult({ 
        testName, 
        success: result, 
        timestamp: new Date().toLocaleTimeString() 
      });
      console.log(`✅ ${testName} completed: ${result ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error(`❌ ${testName} error:`, error);
      setLastResult({ 
        testName, 
        success: false, 
        error: error.message,
        timestamp: new Date().toLocaleTimeString() 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const buttonStyle = {
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: isRunning ? 'not-allowed' : 'pointer',
    margin: '5px',
    opacity: isRunning ? 0.6 : 1
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444'
  };

  const resultStyle = {
    backgroundColor: lastResult?.success ? '#dcfce7' : '#fef2f2',
    border: `1px solid ${lastResult?.success ? '#16a34a' : '#ef4444'}`,
    borderRadius: '5px',
    padding: '15px',
    margin: '10px 0',
    color: lastResult?.success ? '#16a34a' : '#ef4444'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Database Functions Tester</h2>
      
      <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h3>Environment Status</h3>
        <p>
          <strong>Database URL:</strong> {process.env.REACT_APP_TURSO_DATABASE_URL ? '✅ Set' : '❌ Missing'}
        </p>
        <p>
          <strong>Auth Token:</strong> {process.env.REACT_APP_TURSO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Controls</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '15px' }}>
          Open browser console (F12) to see detailed test output
        </p>
        
        <button 
          style={buttonStyle} 
          onClick={() => runTest(runCompleteTestSuite, 'Complete Test Suite')}
          disabled={isRunning}
        >
          {isRunning ? '🔄 Running...' : '🚀 Run All Tests'}
        </button>
        
        <button 
          style={buttonStyle} 
          onClick={() => runTest(runReadOnlyTests, 'Read-Only Tests')}
          disabled={isRunning}
        >
          📖 Read-Only Tests
        </button>
        
        <button 
          style={buttonStyle} 
          onClick={() => runTest(runWriteTests, 'Write Tests')}
          disabled={isRunning}
        >
          ✏️ Write Tests
        </button>
        
        <button 
          style={buttonStyle} 
          onClick={() => runTest(testErrorHandling, 'Error Handling Tests')}
          disabled={isRunning}
        >
          ⚠️ Error Tests
        </button>
        
        <button 
          style={dangerButtonStyle} 
          onClick={() => runTest(cleanupBrowserTests, 'Cleanup Test Data')}
          disabled={isRunning}
        >
          🧹 Cleanup
        </button>
      </div>

      {lastResult && (
        <div style={resultStyle}>
          <h3>Last Test Result</h3>
          <p><strong>Test:</strong> {lastResult.testName}</p>
          <p><strong>Time:</strong> {lastResult.timestamp}</p>
          <p><strong>Status:</strong> {lastResult.success ? '✅ PASSED' : '❌ FAILED'}</p>
          {lastResult.error && (
            <p><strong>Error:</strong> {lastResult.error}</p>
          )}
          <p style={{ fontSize: '12px', color: '#6b7280' }}>
            Check browser console for detailed output
          </p>
        </div>
      )}

      <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
        <h3>Manual Testing</h3>
        <p>You can also run tests manually in the browser console:</p>
        <code style={{ backgroundColor: '#e5e7eb', padding: '2px 4px', borderRadius: '3px' }}>
          runCompleteTestSuite()
        </code>
        <br />
        <code style={{ backgroundColor: '#e5e7eb', padding: '2px 4px', borderRadius: '3px' }}>
          runReadOnlyTests()
        </code>
        <br />
        <code style={{ backgroundColor: '#e5e7eb', padding: '2px 4px', borderRadius: '3px' }}>
          runWriteTests()
        </code>
      </div>
    </div>
  );
};

export default DatabaseFunctionTester;