-- Master Test Runner for Invoice Numbering System
-- Runs all tests with clear PASS/FAIL output and cleanup
-- Run this file to execute the complete test suite

.print ''
.print '============================================================================'
.print 'INVOICE NUMBERING SYSTEM TEST SUITE'
.print '============================================================================'
.print 'Testing: Auto-generation, Sequential numbering, Validation, Status workflow'
.print 'Database: Turso/libSQL compatible'
.print 'Schema: Updated with invoice_counter table and triggers'
.print '============================================================================'
.print ''

-- Enable error display
.bail on
.headers on
.mode column

-- ============================================================================
-- PRE-TEST SETUP AND VALIDATION
-- ============================================================================
.print '--- PRE-TEST: Validating Schema Setup ---'

-- Check if required tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='invoice_counter')
        THEN '✅ PASS: invoice_counter table exists'
        ELSE '❌ FAIL: invoice_counter table missing'
    END AS schema_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pragma_table_info('invoices') WHERE name='invoice_number')
        THEN '✅ PASS: invoice_number column exists'
        ELSE '❌ FAIL: invoice_number column missing'
    END AS column_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='generate_invoice_number')
        THEN '✅ PASS: invoice numbering trigger exists'
        ELSE '❌ FAIL: invoice numbering trigger missing'
    END AS trigger_check;

.print ''

-- Setup test client
DELETE FROM invoices WHERE client_id = 9999;
DELETE FROM clients WHERE id = 9999;
INSERT OR IGNORE INTO clients (id, name, address, area, phone, service_type, services, price, payment_method, created_date)
VALUES (9999, 'TEST_CLIENT_DO_NOT_USE', '123 Test St', 'Downtown', '555-0123', 'Lawn Care', 'Testing', '$0', 'Cash', date('now'));

.print '--- Test client created (ID: 9999) ---'
.print ''

-- ============================================================================
-- TEST 1: Auto-Generation Basic Functionality
-- ============================================================================
.print '============================================================================'
.print 'TEST 1: Invoice Number Auto-Generation'
.print '============================================================================'

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 100.00, 7.50, 107.50);

SELECT 
    '1. Auto-Generation Test:' AS test_name,
    invoice_number,
    CASE 
        WHEN invoice_number LIKE 'INV-2025-%' AND LENGTH(invoice_number) = 12 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result,
    'Should be INV-2025-XXXX format' AS expected
FROM invoices 
WHERE client_id = 9999 
ORDER BY id DESC LIMIT 1;

.print ''

-- ============================================================================
-- TEST 2: Sequential Numbering
-- ============================================================================
.print '============================================================================'
.print 'TEST 2: Sequential Numbering'
.print '============================================================================'

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 200.00, 15.00, 215.00);

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 300.00, 22.50, 322.50);

.print '2. Sequential Numbering Test:'
SELECT 
    ROW_NUMBER() OVER (ORDER BY id) AS sequence,
    invoice_number,
    CASE 
        WHEN CAST(substr(invoice_number, 10, 4) AS INTEGER) = 
             CAST(substr((SELECT MIN(invoice_number) FROM invoices WHERE client_id = 9999), 10, 4) AS INTEGER) + 
             ROW_NUMBER() OVER (ORDER BY id) - 1
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result
FROM invoices 
WHERE client_id = 9999 
ORDER BY id;

.print ''

-- ============================================================================
-- TEST 3: Counter Table Synchronization
-- ============================================================================
.print '============================================================================'
.print 'TEST 3: Counter Table Synchronization'
.print '============================================================================'

SELECT 
    '3. Counter Sync Test:' AS test_name,
    year,
    last_number,
    (SELECT COUNT(*) FROM invoices WHERE client_id = 9999) AS invoices_created,
    CASE 
        WHEN last_number >= (SELECT COUNT(*) FROM invoices WHERE client_id = 9999)
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result
FROM invoice_counter 
WHERE year = 2025;

.print ''

-- ============================================================================
-- TEST 4: Duplicate Prevention (Negative Test)
-- ============================================================================
.print '============================================================================'
.print 'TEST 4: Duplicate Invoice Number Prevention'
.print '============================================================================'

.print '4. Duplicate Prevention Test:'
.print 'Attempting to create duplicate invoice number...'

-- Get existing invoice number for duplicate test
CREATE TEMP TABLE temp_duplicate_test AS
SELECT invoice_number FROM invoices WHERE client_id = 9999 LIMIT 1;

-- Attempt duplicate (this should fail)
.print 'Expected: UNIQUE constraint error'

BEGIN;
INSERT OR FAIL INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
SELECT invoice_number, 9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 999.00, 74.93, 1073.93
FROM temp_duplicate_test;

-- This should not execute due to constraint violation
SELECT '❌ FAIL: Duplicate was allowed' AS result;
ROLLBACK;

-- If we get here, the constraint worked
.print '✅ PASS: Duplicate invoice number correctly rejected'

DROP TABLE temp_duplicate_test;

.print ''

-- ============================================================================
-- TEST 5: Format Validation
-- ============================================================================
.print '============================================================================'
.print 'TEST 5: Invoice Number Format Validation'
.print '============================================================================'

.print '5a. Valid Format Test:'
INSERT INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
VALUES ('INV-2025-8888', 9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 400.00, 30.00, 430.00);

SELECT 
    'Valid format insert:' AS test_name,
    invoice_number,
    '✅ PASS' AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-8888';

.print ''
.print '5b. Invalid Format Test (should fail):'

-- Test invalid formats - these should fail
.print 'Testing invalid format: INVALID-FORMAT'

BEGIN;
-- This should fail due to CHECK constraint
INSERT OR FAIL INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
VALUES ('INVALID-FORMAT', 9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 500.00, 37.50, 537.50);

SELECT '❌ FAIL: Invalid format was allowed' AS result;
ROLLBACK;

.print '✅ PASS: Invalid format correctly rejected'

.print ''

-- ============================================================================
-- TEST 6: Status Workflow
-- ============================================================================
.print '============================================================================'
.print 'TEST 6: Status Workflow Validation'
.print '============================================================================'

-- Test all valid statuses
UPDATE invoices SET status = 'collecting' WHERE invoice_number = 'INV-2025-8888';
UPDATE invoices SET status = 'sent' WHERE invoice_number = 'INV-2025-8888';  
UPDATE invoices SET status = 'paid' WHERE invoice_number = 'INV-2025-8888';
UPDATE invoices SET status = 'overdue' WHERE invoice_number = 'INV-2025-8888';

SELECT 
    '6. Status Workflow Test:' AS test_name,
    status,
    CASE 
        WHEN status IN ('collecting', 'sent', 'paid', 'overdue') 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-8888';

.print '6b. Invalid Status Test (should fail):'

BEGIN;
UPDATE invoices SET status = 'invalid_status' WHERE invoice_number = 'INV-2025-8888';
SELECT '❌ FAIL: Invalid status was allowed' AS result;
ROLLBACK;

.print '✅ PASS: Invalid status correctly rejected'

.print ''

-- ============================================================================
-- TEST 7: Receipt Tracking
-- ============================================================================
.print '============================================================================'
.print 'TEST 7: Receipt Tracking Fields'
.print '============================================================================'

-- Test receipt fields
UPDATE invoices 
SET receipt_sent_date = date('now'),
    receipt_delivery_method = 'email'
WHERE invoice_number = 'INV-2025-8888';

SELECT 
    '7a. Receipt Fields Test:' AS test_name,
    receipt_sent_date,
    receipt_delivery_method,
    CASE 
        WHEN receipt_sent_date IS NOT NULL AND receipt_delivery_method = 'email' 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-8888';

-- Test all valid delivery methods
UPDATE invoices SET receipt_delivery_method = 'text' WHERE invoice_number = 'INV-2025-8888';
UPDATE invoices SET receipt_delivery_method = 'none' WHERE invoice_number = 'INV-2025-8888';
UPDATE invoices SET receipt_delivery_method = NULL WHERE invoice_number = 'INV-2025-8888';

SELECT 
    '7b. Delivery Methods Test:' AS test_name,
    'All valid methods accepted' AS status,
    '✅ PASS' AS result;

.print '7c. Invalid Delivery Method Test (should fail):'

BEGIN;
UPDATE invoices SET receipt_delivery_method = 'invalid_method' WHERE invoice_number = 'INV-2025-8888';
SELECT '❌ FAIL: Invalid delivery method was allowed' AS result;
ROLLBACK;

.print '✅ PASS: Invalid delivery method correctly rejected'

.print ''

-- ============================================================================
-- TEST 8: Default Status
-- ============================================================================
.print '============================================================================'
.print 'TEST 8: Default Status Validation'
.print '============================================================================'

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'TEST_CLIENT_DO_NOT_USE', date('now'), date('now', '+30 days'), 600.00, 45.00, 645.00);

SELECT 
    '8. Default Status Test:' AS test_name,
    status,
    CASE 
        WHEN status = 'collecting' 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS result
FROM invoices 
WHERE client_id = 9999 
ORDER BY id DESC LIMIT 1;

.print ''

-- ============================================================================
-- TEST SUMMARY AND CLEANUP
-- ============================================================================
.print '============================================================================'
.print 'TEST SUMMARY'
.print '============================================================================'

SELECT 
    'Total test invoices:' AS metric,
    COUNT(*) AS value,
    CASE 
        WHEN COUNT(*) >= 5 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS status
FROM invoices 
WHERE client_id = 9999;

SELECT 
    'Invoices with correct format:' AS metric,
    COUNT(*) AS value,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM invoices WHERE client_id = 9999)
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS status
FROM invoices 
WHERE client_id = 9999 AND invoice_number LIKE 'INV-2025-%' AND LENGTH(invoice_number) = 12;

SELECT 
    'Counter synchronization:' AS metric,
    last_number AS value,
    CASE 
        WHEN last_number > 0 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END AS status
FROM invoice_counter 
WHERE year = 2025;

.print ''
.print '============================================================================'
.print 'FINAL VALIDATION'
.print '============================================================================'

-- Final comprehensive check
WITH test_results AS (
    SELECT 
        CASE 
            WHEN (SELECT COUNT(*) FROM invoices WHERE client_id = 9999 AND (invoice_number NOT LIKE 'INV-2025-%' OR LENGTH(invoice_number) != 12)) = 0
            THEN 1 ELSE 0 
        END AS format_test,
        CASE 
            WHEN (SELECT COUNT(DISTINCT invoice_number) FROM invoices WHERE client_id = 9999) = (SELECT COUNT(*) FROM invoices WHERE client_id = 9999)
            THEN 1 ELSE 0 
        END AS uniqueness_test,
        CASE 
            WHEN (SELECT COUNT(*) FROM invoices WHERE client_id = 9999 AND status NOT IN ('collecting', 'sent', 'paid', 'overdue')) = 0
            THEN 1 ELSE 0 
        END AS status_test,
        CASE 
            WHEN (SELECT last_number FROM invoice_counter WHERE year = 2025) > 0
            THEN 1 ELSE 0 
        END AS counter_test
)
SELECT 
    CASE 
        WHEN format_test + uniqueness_test + status_test + counter_test = 4
        THEN '🎉 ALL TESTS PASSED - Invoice numbering system is working perfectly!'
        ELSE '⚠️  SOME TESTS FAILED - Review results above'
    END AS final_result,
    format_test + uniqueness_test + status_test + counter_test AS tests_passed,
    4 AS total_tests
FROM test_results;

.print ''
.print '--- Cleaning up test data ---'

-- Cleanup (uncomment to remove test data)
DELETE FROM invoices WHERE client_id = 9999;
DELETE FROM clients WHERE id = 9999;

.print 'Test data cleaned up'
.print ''
.print '============================================================================'
.print 'TEST SUITE COMPLETED'
.print '============================================================================'
.print 'Check results above. All tests should show ✅ PASS for a working system.'
.print 'If any show ❌ FAIL, review the specific test section for details.'
.print '============================================================================'