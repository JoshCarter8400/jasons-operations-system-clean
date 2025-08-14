# Complete Testing Instructions for Invoice Numbering System

## Overview
These instructions will walk you through testing the invoice numbering schema to ensure it's bulletproof before using it in production.

## Prerequisites
- Turso CLI installed and authenticated
- Database connection ready
- Schema and migration files created

---

## STEP 1: Database Setup

### Option A: Testing on New Database
```bash
# Create a fresh test database
turso db create jason-landscaping-test

# Get the database URL
turso db show jason-landscaping-test

# Apply the complete schema
turso db shell jason-landscaping-test < src/utils/database-schema.sql
```

### Option B: Testing Migration on Existing Database
```bash
# Backup existing database first
turso db dump jason-landscaping > backup-$(date +%Y%m%d-%H%M%S).sql

# Apply the migration
turso db shell jason-landscaping < src/utils/migration.sql
```

---

## STEP 2: Run Comprehensive Test Suite

### Execute the Master Test Runner
```bash
# Run the complete test suite
turso db shell [your-database-name] < src/utils/run_tests.sql
```

### What You Should See (Success):
```
============================================================================
INVOICE NUMBERING SYSTEM TEST SUITE
============================================================================

--- PRE-TEST: Validating Schema Setup ---
schema_check                           
✅ PASS: invoice_counter table exists  

column_check                           
✅ PASS: invoice_number column exists  

trigger_check                          
✅ PASS: invoice numbering trigger exists

--- Test client created (ID: 9999) ---

============================================================================
TEST 1: Invoice Number Auto-Generation
============================================================================

test_name                 | invoice_number | result   | expected
1. Auto-Generation Test:  | INV-2025-0001  | ✅ PASS  | Should be INV-2025-XXXX format

============================================================================
TEST 2: Sequential Numbering  
============================================================================
2. Sequential Numbering Test:
sequence | invoice_number | result
1        | INV-2025-0001  | ✅ PASS
2        | INV-2025-0002  | ✅ PASS
3        | INV-2025-0003  | ✅ PASS

[... more test results ...]

============================================================================
FINAL VALIDATION
============================================================================
final_result                                                      | tests_passed | total_tests
🎉 ALL TESTS PASSED - Invoice numbering system is working perfectly! | 4            | 4

============================================================================
TEST SUITE COMPLETED
============================================================================
```

---

## STEP 3: Verification Queries

### Run System Health Check
```bash
# Check overall system status
turso db shell [your-database-name] < src/utils/verification_queries.sql
```

### Expected Healthy Output:
```
--- 7. SYSTEM HEALTH SUMMARY ---
component                  | status
Schema Tables:            | ✅ PASS
Auto-numbering Triggers:  | ✅ PASS
Invoice Number Format:    | ✅ PASS
Uniqueness Constraint:    | ✅ PASS
Status Workflow:          | ✅ PASS
2025 Counter Ready:       | ✅ PASS

overall_status                                                    | checks_passed | total_checks
🎉 PERFECT: Invoice numbering system is fully operational!        | 6             | 6
```

---

## STEP 4: Manual Testing

### Test Invoice Creation
```sql
-- Connect to your database
turso db shell [your-database-name]

-- Create a real client for testing
INSERT INTO clients (name, address, area, phone, service_type, services, price, payment_method, created_date)
VALUES ('Manual Test Client', '456 Real St', 'Downtown', '555-0199', 'Lawn Care', 'Weekly mowing', '$75', 'Cash', date('now'));

-- Create invoice (should auto-generate number)
INSERT INTO invoices (client_id, client_name, date, due_date, subtotal, tax, total)
VALUES (last_insert_rowid(), 'Manual Test Client', date('now'), date('now', '+30 days'), 75.00, 5.63, 80.63);

-- Check the invoice number
SELECT invoice_number, status FROM invoices ORDER BY id DESC LIMIT 1;
-- Expected: INV-2025-XXXX, collecting
```

### Test Status Workflow
```sql
-- Update invoice through workflow
UPDATE invoices SET status = 'sent' WHERE invoice_number = 'INV-2025-XXXX';
UPDATE invoices SET status = 'paid' WHERE invoice_number = 'INV-2025-XXXX';

-- Add receipt information
UPDATE invoices 
SET receipt_sent_date = date('now'), receipt_delivery_method = 'email' 
WHERE invoice_number = 'INV-2025-XXXX';

-- Verify
SELECT invoice_number, status, receipt_sent_date, receipt_delivery_method 
FROM invoices WHERE invoice_number = 'INV-2025-XXXX';
```

---

## STEP 5: Error Testing

### Test Duplicate Prevention
```sql
-- This should FAIL with UNIQUE constraint error
INSERT INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
VALUES ('INV-2025-0001', 1, 'Test', date('now'), date('now', '+30 days'), 100, 7.50, 107.50);
-- Expected: Error: UNIQUE constraint failed: invoices.invoice_number
```

### Test Invalid Status
```sql
-- This should FAIL with CHECK constraint error  
UPDATE invoices SET status = 'invalid_status' WHERE id = 1;
-- Expected: Error: CHECK constraint failed: status IN ('collecting', 'sent', 'paid', 'overdue')
```

### Test Invalid Format
```sql
-- This should FAIL with CHECK constraint error
INSERT INTO invoices (invoice_number, client_id, client_name, date, due_date, subtotal, tax, total)
VALUES ('WRONG-FORMAT', 1, 'Test', date('now'), date('now', '+30 days'), 100, 7.50, 107.50);
-- Expected: Error: CHECK constraint failed
```

---

## SUCCESS CRITERIA CHECKLIST

### ✅ System is BULLETPROOF if ALL of these pass:

#### Schema & Structure:
- [ ] `invoice_counter` table exists with year/last_number columns
- [ ] `invoices` table has `invoice_number` column (TEXT UNIQUE)
- [ ] `invoices` table has receipt tracking columns
- [ ] All required triggers exist and are active

#### Auto-numbering:
- [ ] New invoices automatically get INV-2025-XXXX numbers
- [ ] Numbers are sequential with no gaps
- [ ] Counter table increments correctly
- [ ] Year rollover handling works

#### Data Integrity:
- [ ] Duplicate invoice numbers are prevented (UNIQUE constraint)
- [ ] Invalid formats are rejected (CHECK constraint)
- [ ] Invalid statuses are rejected
- [ ] Invalid receipt methods are rejected

#### Workflow:
- [ ] Default status is 'collecting'
- [ ] Status transitions work: collecting → sent → paid → overdue
- [ ] Receipt tracking works properly

#### Migration:
- [ ] Existing invoices get retroactive numbers
- [ ] No data is lost during migration
- [ ] Counter synchronizes with existing data

---

## TROUBLESHOOTING

### ❌ If Tests Fail:

#### "Table doesn't exist" errors:
```bash
# Apply the schema first
turso db shell [your-database-name] < src/utils/database-schema.sql
```

#### "Trigger doesn't exist" errors:
```bash
# Re-apply migration to create triggers
turso db shell [your-database-name] < src/utils/migration.sql
```

#### "Column doesn't exist" errors:
```bash
# Check if migration was applied
turso db shell [your-database-name] "PRAGMA table_info(invoices);"
# Look for invoice_number, receipt_sent_date, receipt_delivery_method
```

#### Numbers not auto-generating:
```sql
-- Check if trigger exists
SELECT name FROM sqlite_master WHERE type='trigger' AND name='generate_invoice_number';

-- Check counter table
SELECT * FROM invoice_counter;
```

#### Duplicates allowed:
```sql
-- Check if unique constraint exists
SELECT sql FROM sqlite_master WHERE name='invoices' AND type='table';
-- Should contain: invoice_number TEXT UNIQUE NOT NULL
```

---

## FINAL VALIDATION COMMANDS

### Quick Health Check:
```sql
-- Run these queries to verify everything is working:

-- 1. Counter status
SELECT * FROM invoice_counter WHERE year = 2025;

-- 2. Recent invoices
SELECT invoice_number, client_name, status, created_at 
FROM invoices ORDER BY created_at DESC LIMIT 5;

-- 3. System health
SELECT 
    COUNT(*) as total_invoices,
    COUNT(invoice_number) as invoices_with_numbers,
    COUNT(DISTINCT invoice_number) as unique_numbers
FROM invoices;
```

### Expected Results for Healthy System:
- Counter shows year=2025, last_number > 0
- All recent invoices have INV-2025-XXXX format
- total_invoices = invoices_with_numbers = unique_numbers

---

## PRODUCTION DEPLOYMENT

### Only deploy to production if:
1. ✅ All tests in `run_tests.sql` show PASS
2. ✅ `verification_queries.sql` shows 6/6 checks passed
3. ✅ Manual testing confirms auto-numbering works
4. ✅ Error testing confirms constraints work
5. ✅ Migration testing preserves existing data

### Deployment Commands:
```bash
# Backup production database
turso db dump jason-landscaping > production-backup-$(date +%Y%m%d-%H%M%S).sql

# Apply migration to production
turso db shell jason-landscaping < src/utils/migration.sql

# Verify production deployment
turso db shell jason-landscaping < src/utils/verification_queries.sql
```

**🎉 If all tests pass, your invoice numbering system is bulletproof and ready for production!**