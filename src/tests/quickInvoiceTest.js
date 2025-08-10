// Quick Invoice Test - Verify JavaScript code structure and imports
// Run with: node src/tests/quickInvoiceTest.js

console.log('🧪 Starting Invoice Number Generator Quick Test...\n');

let passCount = 0;
let failCount = 0;

function logPass(message) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
}

function logFail(message, error = null) {
    console.log(`❌ FAIL: ${message}`);
    if (error) console.log(`   Error: ${error.message}`);
    failCount++;
}

// TEST 1: FILE IMPORTS
console.log('📁 Testing File Imports...');

let InvoiceNumberGenerator;
let invoiceHelpers;
let databaseHelpers;

try {
    InvoiceNumberGenerator = require('../utils/InvoiceNumberGenerator.js');
    logPass('InvoiceNumberGenerator imported successfully');
} catch (error) {
    logFail('InvoiceNumberGenerator import failed', error);
}

try {
    invoiceHelpers = require('../utils/invoiceHelpers.js');
    logPass('invoiceHelpers imported successfully');
} catch (error) {
    logFail('invoiceHelpers import failed', error);
}

try {
    databaseHelpers = require('../utils/databaseHelpers.js');
    logPass('databaseHelpers imported successfully');
} catch (error) {
    logFail('databaseHelpers import failed', error);
}

// TEST 2: CLASS CREATION
console.log('\n🏗️  Testing Class Creation...');

let generator;
try {
    generator = new InvoiceNumberGenerator(null); // Pass null for database
    logPass('InvoiceNumberGenerator instance created successfully');
} catch (error) {
    logFail('InvoiceNumberGenerator instance creation failed', error);
}

// TEST 3: BASIC METHOD VALIDATION
console.log('\n🔍 Testing Basic Methods...');

if (generator) {
    try {
        if (typeof generator.validateInvoiceNumber === 'function') {
            logPass('validateInvoiceNumber method exists');
            
            // Test valid format
            const validResult = generator.validateInvoiceNumber('INV-2025-0001');
            if (validResult === true) {
                logPass('Valid invoice number format recognized');
            } else {
                logFail('Valid invoice number format not recognized');
            }
            
            // Test invalid format
            const invalidResult = generator.validateInvoiceNumber('INVALID');
            if (invalidResult === false) {
                logPass('Invalid invoice number format rejected');
            } else {
                logFail('Invalid invoice number format not rejected');
            }
        } else {
            logFail('validateInvoiceNumber method not found');
        }
    } catch (error) {
        logFail('validateInvoiceNumber method test failed', error);
    }
} else {
    logFail('Cannot test methods - generator instance not created');
}

// TEST 4: HELPER FUNCTIONS AVAILABILITY
console.log('\n🛠️  Testing Helper Functions...');

if (invoiceHelpers) {
    try {
        const helperFunctions = Object.keys(invoiceHelpers);
        if (helperFunctions.length > 0) {
            logPass(`invoiceHelpers has ${helperFunctions.length} functions: ${helperFunctions.join(', ')}`);
        } else {
            logFail('invoiceHelpers has no exported functions');
        }
    } catch (error) {
        logFail('invoiceHelpers function check failed', error);
    }
} else {
    logFail('Cannot test invoiceHelpers - not imported');
}

if (databaseHelpers) {
    try {
        const helperFunctions = Object.keys(databaseHelpers);
        if (helperFunctions.length > 0) {
            logPass(`databaseHelpers has ${helperFunctions.length} functions: ${helperFunctions.join(', ')}`);
        } else {
            logFail('databaseHelpers has no exported functions');
        }
    } catch (error) {
        logFail('databaseHelpers function check failed', error);
    }
} else {
    logFail('Cannot test databaseHelpers - not imported');
}

// FINAL RESULTS
console.log('\n📊 Test Results Summary:');
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📈 Total Tests: ${passCount + failCount}`);

if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! JavaScript code structure is ready for integration.');
} else {
    console.log('\n⚠️  Some tests failed. Check the errors above and fix the issues.');
}

console.log('\n💡 Instructions:');
console.log('   - Run this test with: node src/tests/quickInvoiceTest.js');
console.log('   - Fix any import or structure issues before database integration');
console.log('   - This test does not require database connection');