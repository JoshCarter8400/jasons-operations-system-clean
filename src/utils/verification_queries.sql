-- Verification Queries for Invoice Numbering System
-- Run these queries to check the current status and health of the invoice numbering system
-- Can be run at any time to verify system integrity

.print '============================================================================'
.print 'INVOICE NUMBERING SYSTEM VERIFICATION'
.print '============================================================================'
.print 'Use these queries to verify the invoice numbering system is working correctly'
.print 'Safe to run at any time - read-only queries'
.print '============================================================================'
.print ''

-- Enable column headers and better formatting
.headers on
.mode column

-- ============================================================================
-- 1. SCHEMA VERIFICATION
-- ============================================================================
.print '--- 1. SCHEMA VERIFICATION ---'
.print 'Checking if all required tables, columns, and triggers exist...'
.print ''

-- Check if invoice_counter table exists with correct structure
.print '1a. Invoice Counter Table Structure:'
PRAGMA table_info(invoice_counter);

.print ''
.print '1b. Invoice Table Structure (showing new columns):'
SELECT name, type, "notnull", dflt_value, pk
FROM pragma_table_info('invoices') 
WHERE name IN ('invoice_number', 'status', 'receipt_sent_date', 'receipt_delivery_method')
ORDER BY name;

.print ''
.print '1c. Required Triggers:'
SELECT 
    name,
    CASE 
        WHEN name IS NOT NULL THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END AS status
FROM (
    SELECT 'generate_invoice_number' AS expected_trigger
    UNION SELECT 'validate_invoice_number_update'
    UNION SELECT 'update_invoice_counter_timestamp'
) expected
LEFT JOIN sqlite_master sm ON expected.expected_trigger = sm.name AND sm.type = 'trigger';

.print ''
.print '1d. Required Indexes:'
SELECT 
    name,
    CASE 
        WHEN name IS NOT NULL THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END AS status
FROM (
    SELECT 'idx_invoices_invoice_number' AS expected_index
) expected
LEFT JOIN sqlite_master sm ON expected.expected_index = sm.name AND sm.type = 'index';

.print ''

-- ============================================================================
-- 2. COUNTER STATUS
-- ============================================================================
.print '--- 2. INVOICE COUNTER STATUS ---'
.print 'Current state of invoice counters by year...'
.print ''

SELECT 
    year,
    last_number,
    created_at,
    updated_at,
    CASE 
        WHEN last_number >= 0 THEN '✅ VALID'
        ELSE '❌ INVALID'
    END AS status
FROM invoice_counter
ORDER BY year;

-- Show if 2025 counter exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM invoice_counter WHERE year = 2025)
        THEN '✅ 2025 counter exists'
        ELSE '❌ 2025 counter missing'
    END AS counter_2025_check;

.print ''

-- ============================================================================
-- 3. INVOICE NUMBER ANALYSIS
-- ============================================================================
.print '--- 3. INVOICE NUMBER ANALYSIS ---'
.print 'Analysis of existing invoice numbers...'
.print ''

.print '3a. Invoice Number Format Compliance:'
SELECT 
    'Total invoices:' AS metric,
    COUNT(*) AS count
FROM invoices;

SELECT 
    'Invoices with numbers:' AS metric,
    COUNT(*) AS count
FROM invoices 
WHERE invoice_number IS NOT NULL AND invoice_number != '';

SELECT 
    'Correctly formatted:' AS metric,
    COUNT(*) AS count
FROM invoices 
WHERE invoice_number LIKE 'INV-____-____' AND LENGTH(invoice_number) = 12;

SELECT 
    'Incorrectly formatted:' AS metric,
    COUNT(*) AS count
FROM invoices 
WHERE invoice_number IS NOT NULL 
AND invoice_number != '' 
AND NOT (invoice_number LIKE 'INV-____-____' AND LENGTH(invoice_number) = 12);

.print ''
.print '3b. Invoice Number Distribution by Year:'
SELECT 
    substr(invoice_number, 5, 4) AS year,
    COUNT(*) AS count,
    MIN(CAST(substr(invoice_number, 10, 4) AS INTEGER)) AS min_number,
    MAX(CAST(substr(invoice_number, 10, 4) AS INTEGER)) AS max_number
FROM invoices 
WHERE invoice_number LIKE 'INV-____-____'
GROUP BY substr(invoice_number, 5, 4)
ORDER BY year;

.print ''
.print '3c. Recent Invoice Numbers (last 10):'
SELECT 
    invoice_number,
    client_name,
    date,
    status,
    created_at
FROM invoices 
WHERE invoice_number IS NOT NULL
ORDER BY created_at DESC, id DESC 
LIMIT 10;

.print ''

-- ============================================================================
-- 4. STATUS WORKFLOW ANALYSIS  
-- ============================================================================
.print '--- 4. STATUS WORKFLOW ANALYSIS ---'
.print 'Analysis of invoice statuses...'
.print ''

.print '4a. Status Distribution:'
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM invoices), 2) AS percentage
FROM invoices 
GROUP BY status
ORDER BY count DESC;

.print ''
.print '4b. Invalid Statuses (should be empty):'
SELECT 
    invoice_number,
    status,
    '❌ INVALID STATUS' AS issue
FROM invoices 
WHERE status NOT IN ('collecting', 'sent', 'paid', 'overdue')
LIMIT 10;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('collecting', 'sent', 'paid', 'overdue')) = 0
        THEN '✅ All statuses are valid'
        ELSE '❌ Found invalid statuses'
    END AS status_validation;

.print ''

-- ============================================================================
-- 5. RECEIPT TRACKING ANALYSIS
-- ============================================================================
.print '--- 5. RECEIPT TRACKING ANALYSIS ---'
.print 'Analysis of receipt tracking fields...'
.print ''

.print '5a. Receipt Delivery Methods:'
SELECT 
    COALESCE(receipt_delivery_method, 'NULL') AS delivery_method,
    COUNT(*) AS count
FROM invoices 
GROUP BY receipt_delivery_method
ORDER BY count DESC;

.print ''
.print '5b. Invoices with Receipt Information:'
SELECT 
    COUNT(*) AS total_invoices,
    COUNT(receipt_sent_date) AS with_receipt_date,
    COUNT(receipt_delivery_method) AS with_delivery_method
FROM invoices;

.print ''
.print '5c. Recent Receipts (last 5 with receipt info):'
SELECT 
    invoice_number,
    client_name,
    receipt_sent_date,
    receipt_delivery_method,
    status
FROM invoices 
WHERE receipt_sent_date IS NOT NULL OR receipt_delivery_method IS NOT NULL
ORDER BY COALESCE(receipt_sent_date, created_at) DESC
LIMIT 5;

.print ''

-- ============================================================================
-- 6. DATA INTEGRITY CHECKS
-- ============================================================================
.print '--- 6. DATA INTEGRITY CHECKS ---'
.print 'Checking for data integrity issues...'
.print ''

.print '6a. Duplicate Invoice Numbers (should be empty):'
SELECT 
    invoice_number,
    COUNT(*) AS duplicate_count,
    '❌ DUPLICATE' AS issue
FROM invoices 
WHERE invoice_number IS NOT NULL
GROUP BY invoice_number 
HAVING COUNT(*) > 1;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT invoice_number FROM invoices 
            WHERE invoice_number IS NOT NULL 
            GROUP BY invoice_number 
            HAVING COUNT(*) > 1
        )) = 0
        THEN '✅ No duplicate invoice numbers'
        ELSE '❌ Found duplicate invoice numbers'
    END AS duplicate_check;

.print ''
.print '6b. Invoices Missing Numbers:'
SELECT 
    id,
    client_name,
    date,
    total,
    '❌ MISSING NUMBER' AS issue
FROM invoices 
WHERE invoice_number IS NULL OR invoice_number = ''
LIMIT 10;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM invoices WHERE invoice_number IS NULL OR invoice_number = '') = 0
        THEN '✅ All invoices have numbers'
        ELSE '❌ Some invoices missing numbers: ' || 
             (SELECT COUNT(*) FROM invoices WHERE invoice_number IS NULL OR invoice_number = '')
    END AS missing_numbers_check;

.print ''
.print '6c. Counter Synchronization:'
-- Check if counter matches highest invoice number for each year
WITH year_analysis AS (
    SELECT 
        substr(invoice_number, 5, 4) AS year,
        MAX(CAST(substr(invoice_number, 10, 4) AS INTEGER)) AS max_invoice_num
    FROM invoices 
    WHERE invoice_number LIKE 'INV-____-____'
    GROUP BY substr(invoice_number, 5, 4)
)
SELECT 
    ya.year,
    ya.max_invoice_num AS highest_invoice_number,
    ic.last_number AS counter_value,
    CASE 
        WHEN ic.last_number >= ya.max_invoice_num 
        THEN '✅ SYNCED' 
        ELSE '❌ OUT OF SYNC' 
    END AS sync_status
FROM year_analysis ya
LEFT JOIN invoice_counter ic ON ya.year = ic.year
ORDER BY ya.year;

.print ''

-- ============================================================================
-- 7. SYSTEM HEALTH SUMMARY
-- ============================================================================
.print '--- 7. SYSTEM HEALTH SUMMARY ---'
.print 'Overall system health assessment...'
.print ''

WITH health_check AS (
    SELECT 
        -- Check if required tables exist
        CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name = 'invoice_counter' AND type = 'table') THEN 1 ELSE 0 END AS has_counter_table,
        
        -- Check if triggers exist
        CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name = 'generate_invoice_number' AND type = 'trigger') THEN 1 ELSE 0 END AS has_triggers,
        
        -- Check if all invoices have valid numbers
        CASE WHEN (SELECT COUNT(*) FROM invoices WHERE invoice_number IS NULL OR invoice_number = '' OR NOT (invoice_number LIKE 'INV-____-____' AND LENGTH(invoice_number) = 12)) = 0 THEN 1 ELSE 0 END AS all_numbers_valid,
        
        -- Check if no duplicates exist
        CASE WHEN (SELECT COUNT(*) FROM (SELECT invoice_number FROM invoices WHERE invoice_number IS NOT NULL GROUP BY invoice_number HAVING COUNT(*) > 1)) = 0 THEN 1 ELSE 0 END AS no_duplicates,
        
        -- Check if all statuses are valid
        CASE WHEN (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('collecting', 'sent', 'paid', 'overdue')) = 0 THEN 1 ELSE 0 END AS all_statuses_valid,
        
        -- Check if 2025 counter exists
        CASE WHEN EXISTS (SELECT 1 FROM invoice_counter WHERE year = 2025) THEN 1 ELSE 0 END AS has_2025_counter
)
SELECT 
    'Schema Tables:' AS component,
    CASE WHEN has_counter_table = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check

UNION ALL SELECT 
    'Auto-numbering Triggers:' AS component,
    CASE WHEN has_triggers = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check

UNION ALL SELECT 
    'Invoice Number Format:' AS component,
    CASE WHEN all_numbers_valid = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check

UNION ALL SELECT 
    'Uniqueness Constraint:' AS component,
    CASE WHEN no_duplicates = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check

UNION ALL SELECT 
    'Status Workflow:' AS component,
    CASE WHEN all_statuses_valid = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check

UNION ALL SELECT 
    '2025 Counter Ready:' AS component,
    CASE WHEN has_2025_counter = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM health_check;

.print ''

-- Overall system status
WITH health_score AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name = 'invoice_counter' AND type = 'table') THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name = 'generate_invoice_number' AND type = 'trigger') THEN 1 ELSE 0 END +
        CASE WHEN (SELECT COUNT(*) FROM invoices WHERE invoice_number IS NULL OR invoice_number = '' OR NOT (invoice_number LIKE 'INV-____-____' AND LENGTH(invoice_number) = 12)) = 0 THEN 1 ELSE 0 END +
        CASE WHEN (SELECT COUNT(*) FROM (SELECT invoice_number FROM invoices WHERE invoice_number IS NOT NULL GROUP BY invoice_number HAVING COUNT(*) > 1)) = 0 THEN 1 ELSE 0 END +
        CASE WHEN (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('collecting', 'sent', 'paid', 'overdue')) = 0 THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM invoice_counter WHERE year = 2025) THEN 1 ELSE 0 END
        AS score
)
SELECT 
    CASE 
        WHEN score = 6 THEN '🎉 PERFECT: Invoice numbering system is fully operational!'
        WHEN score >= 4 THEN '⚠️  WARNING: System mostly working but has ' || (6 - score) || ' issues'
        ELSE '🚨 CRITICAL: Invoice numbering system has major problems (' || score || '/6 checks passed)'
    END AS overall_status,
    score AS checks_passed,
    6 AS total_checks
FROM health_score;

.print ''
.print '============================================================================'
.print 'VERIFICATION COMPLETED'
.print '============================================================================'
.print 'Review the results above to assess invoice numbering system health.'
.print 'All components should show ✅ PASS for a fully working system.'
.print '============================================================================'