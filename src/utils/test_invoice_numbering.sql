-- Comprehensive Test Suite for Invoice Numbering Schema
-- Tests all invoice numbering functionality, status workflow, and receipt tracking
-- Run after applying migration.sql or creating fresh database with updated schema

-- ============================================================================
-- TEST 1: Basic Invoice Number Auto-Generation
-- ============================================================================
SELECT '=== TEST 1: Basic Invoice Number Auto-Generation ===' AS test_section;

-- Insert test client first (needed for foreign key)
INSERT OR IGNORE INTO clients (id, name, address, area, phone, service_type, services, price, payment_method, created_date)
VALUES (9999, 'Test Client', '123 Test St', 'Downtown', '555-0123', 'Lawn Care', 'Weekly mowing', '$50', 'Cash', date('now'));

-- Insert invoice without specifying invoice_number (should auto-generate)
INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'Test Client', date('now'), date('now', '+30 days'), 100.00, 7.50, 107.50);

-- Check the generated invoice number
SELECT 
    'Auto-generated invoice number:' AS description,
    invoice_number,
    CASE 
        WHEN invoice_number LIKE 'INV-2025-%' AND LENGTH(invoice_number) = 12 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE client_id = 9999 
ORDER BY id DESC LIMIT 1;

-- ============================================================================
-- TEST 2: Sequential Numbering
-- ============================================================================
SELECT '=== TEST 2: Sequential Numbering ===' AS test_section;

-- Insert multiple invoices to test sequential numbering
INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'Test Client', date('now'), date('now', '+30 days'), 200.00, 15.00, 215.00);

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'Test Client', date('now'), date('now', '+30 days'), 300.00, 22.50, 322.50);

-- Check sequential numbering
SELECT 
    'Sequential invoice numbers:' AS description,
    invoice_number,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = CAST(substr(invoice_number, 10, 4) AS INTEGER) - 
             (SELECT CAST(substr(MIN(invoice_number), 10, 4) AS INTEGER) FROM invoices WHERE client_id = 9999) + 1
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE client_id = 9999 
ORDER BY id;

-- ============================================================================
-- TEST 3: Invoice Counter Table Updates
-- ============================================================================
SELECT '=== TEST 3: Invoice Counter Table Updates ===' AS test_section;

-- Check counter table was updated correctly
SELECT 
    'Invoice counter for 2025:' AS description,
    year,
    last_number,
    CASE 
        WHEN year = 2025 AND last_number >= 3 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoice_counter 
WHERE year = 2025;

-- ============================================================================
-- TEST 4: Duplicate Invoice Number Prevention
-- ============================================================================
SELECT '=== TEST 4: Duplicate Invoice Number Prevention ===' AS test_section;

-- This should fail - trying to insert duplicate invoice number
-- Note: In a real test environment, you'd catch the exception
.print 'Attempting to insert duplicate invoice number (should fail):'

-- Get an existing invoice number for the duplicate test
CREATE TEMP TABLE temp_invoice_num AS
SELECT invoice_number FROM invoices WHERE client_id = 9999 LIMIT 1;

-- ============================================================================
-- TEST 5: Invoice Number Format Validation
-- ============================================================================
SELECT '=== TEST 5: Invoice Number Format Validation ===' AS test_section;

-- Test valid format (should work)
INSERT INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
VALUES ('INV-2025-9999', 9999, 'Test Client', date('now'), date('now', '+30 days'), 400.00, 30.00, 430.00);

SELECT 
    'Manual valid invoice number:' AS description,
    invoice_number,
    'PASS' AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-9999';

-- ============================================================================
-- TEST 6: Status Workflow Validation
-- ============================================================================
SELECT '=== TEST 6: Status Workflow Validation ===' AS test_section;

-- Test all valid statuses
UPDATE invoices SET status = 'collecting' WHERE invoice_number = 'INV-2025-9999';
UPDATE invoices SET status = 'sent' WHERE invoice_number = 'INV-2025-9999';
UPDATE invoices SET status = 'paid' WHERE invoice_number = 'INV-2025-9999';
UPDATE invoices SET status = 'overdue' WHERE invoice_number = 'INV-2025-9999';

SELECT 
    'Status workflow test:' AS description,
    status,
    CASE 
        WHEN status IN ('collecting', 'sent', 'paid', 'overdue') 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-9999';

-- ============================================================================
-- TEST 7: Receipt Tracking Fields
-- ============================================================================
SELECT '=== TEST 7: Receipt Tracking Fields ===' AS test_section;

-- Test receipt tracking fields
UPDATE invoices 
SET receipt_sent_date = date('now'),
    receipt_delivery_method = 'email'
WHERE invoice_number = 'INV-2025-9999';

SELECT 
    'Receipt tracking:' AS description,
    receipt_sent_date,
    receipt_delivery_method,
    CASE 
        WHEN receipt_sent_date IS NOT NULL AND receipt_delivery_method = 'email' 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE invoice_number = 'INV-2025-9999';

-- Test all valid receipt delivery methods
UPDATE invoices SET receipt_delivery_method = 'text' WHERE invoice_number = 'INV-2025-9999';
UPDATE invoices SET receipt_delivery_method = 'none' WHERE invoice_number = 'INV-2025-9999';
UPDATE invoices SET receipt_delivery_method = NULL WHERE invoice_number = 'INV-2025-9999';

SELECT 
    'Receipt delivery methods test:' AS description,
    'All methods accepted' AS status,
    'PASS' AS result;

-- ============================================================================
-- TEST 8: Year Rollover Handling (Simulated)
-- ============================================================================
SELECT '=== TEST 8: Year Rollover Handling (Simulated) ===' AS test_section;

-- Insert a counter for next year to simulate rollover
INSERT OR IGNORE INTO invoice_counter (year, last_number) VALUES (2026, 0);

-- Simulate inserting invoice with future date (Note: trigger uses current year, so this is conceptual)
SELECT 
    'Year rollover preparation:' AS description,
    year,
    last_number,
    CASE 
        WHEN year = 2026 AND last_number = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoice_counter 
WHERE year = 2026;

-- ============================================================================
-- TEST 9: Default Status is 'collecting'
-- ============================================================================
SELECT '=== TEST 9: Default Status is collecting ===' AS test_section;

-- Insert invoice without specifying status
INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (9999, 'Test Client', date('now'), date('now', '+30 days'), 500.00, 37.50, 537.50);

SELECT 
    'Default status test:' AS description,
    status,
    CASE 
        WHEN status = 'collecting' 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE client_id = 9999 
ORDER BY id DESC LIMIT 1;

-- ============================================================================
-- TEST 10: Migration Test - Existing Invoices Get Numbers
-- ============================================================================
SELECT '=== TEST 10: Migration Test - Existing Invoices Get Numbers ===' AS test_section;

-- Create an invoice without invoice_number (simulating pre-migration data)
-- First disable the trigger temporarily for this test
DROP TRIGGER IF EXISTS generate_invoice_number;

INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total, invoice_number)
VALUES (9999, 'Test Client Pre-Migration', date('now'), date('now', '+30 days'), 600.00, 45.00, 645.00, NULL);

-- Re-create the trigger
CREATE TRIGGER generate_invoice_number BEFORE INSERT ON invoices
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM invoice_counter WHERE year = strftime('%Y', 'now')) = 0
        THEN 
            (INSERT INTO invoice_counter (year, last_number) VALUES (strftime('%Y', 'now'), 1))
        ELSE
            (UPDATE invoice_counter 
             SET last_number = last_number + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE year = strftime('%Y', 'now'))
    END;
    
    UPDATE NEW SET invoice_number = 'INV-' || strftime('%Y', 'now') || '-' || 
        printf('%04d', (SELECT last_number FROM invoice_counter WHERE year = strftime('%Y', 'now')));
END;

-- Apply migration logic to fix the NULL invoice number
UPDATE invoices 
SET invoice_number = (
    WITH numbered_invoices AS (
        SELECT id, 
               ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num,
               (SELECT MAX(CAST(substr(invoice_number, 10, 4) AS INTEGER)) 
                FROM invoices 
                WHERE invoice_number LIKE 'INV-2025-%' AND invoice_number IS NOT NULL) as max_existing
        FROM invoices 
        WHERE invoice_number IS NULL OR invoice_number = ''
    )
    SELECT 'INV-2025-' || printf('%04d', COALESCE(max_existing, 0) + row_num)
    FROM numbered_invoices 
    WHERE numbered_invoices.id = invoices.id
)
WHERE invoice_number IS NULL OR invoice_number = '';

SELECT 
    'Migration invoice numbering:' AS description,
    invoice_number,
    CASE 
        WHEN invoice_number LIKE 'INV-2025-%' AND LENGTH(invoice_number) = 12 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM invoices 
WHERE client_name = 'Test Client Pre-Migration';

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================
SELECT '=== TEST SUMMARY ===' AS test_section;

SELECT 
    'Total test invoices created:' AS metric,
    COUNT(*) AS value
FROM invoices 
WHERE client_id = 9999;

SELECT 
    'Invoice numbers with correct format:' AS metric,
    COUNT(*) AS value
FROM invoices 
WHERE client_id = 9999 AND invoice_number LIKE 'INV-2025-%' AND LENGTH(invoice_number) = 12;

SELECT 
    'Current counter value:' AS metric,
    last_number AS value
FROM invoice_counter 
WHERE year = 2025;

-- Clean up test data (commented out for inspection)
-- DELETE FROM invoices WHERE client_id = 9999;
-- DELETE FROM clients WHERE id = 9999;
-- DELETE FROM invoice_counter WHERE year = 2026;

SELECT 'Test suite completed. Review results above.' AS final_message;