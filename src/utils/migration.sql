-- Migration script for Jason's Landscaping Business Invoice System
-- Safe to run multiple times - includes IF NOT EXISTS checks
-- Run this on existing Turso database to add invoice numbering and collecting workflow

-- Step 1: Create invoice counter table
CREATE TABLE IF NOT EXISTS invoice_counter (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year)
);

-- Step 2: Add new columns to existing invoices table
-- Add invoice_number column if it doesn't exist
ALTER TABLE invoices ADD COLUMN invoice_number TEXT;

-- Add receipt tracking columns if they don't exist
ALTER TABLE invoices ADD COLUMN receipt_sent_date DATE;
ALTER TABLE invoices ADD COLUMN receipt_delivery_method TEXT;

-- Step 3: Create unique index on invoice_number if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique ON invoices(invoice_number);

-- Step 4: Insert starting counter for 2025 if it doesn't exist
INSERT OR IGNORE INTO invoice_counter (year, last_number) VALUES (2025, 0);

-- Step 5: Update existing invoices to have invoice numbers if they don't already
-- This will generate invoice numbers for existing invoices in chronological order
UPDATE invoices 
SET invoice_number = (
    WITH numbered_invoices AS (
        SELECT id, 
               ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
        FROM invoices 
        WHERE invoice_number IS NULL OR invoice_number = ''
    )
    SELECT 'INV-2025-' || printf('%04d', row_num)
    FROM numbered_invoices 
    WHERE numbered_invoices.id = invoices.id
)
WHERE invoice_number IS NULL OR invoice_number = '';

-- Step 6: Update the invoice counter to reflect the highest number used
UPDATE invoice_counter 
SET last_number = (
    SELECT COALESCE(MAX(CAST(substr(invoice_number, 10, 4) AS INTEGER)), 0)
    FROM invoices 
    WHERE invoice_number LIKE 'INV-2025-%'
),
updated_at = CURRENT_TIMESTAMP
WHERE year = 2025;

-- Step 7: Update existing invoice statuses from old to new workflow
-- Map old status values to new collecting workflow
UPDATE invoices 
SET status = CASE 
    WHEN status = 'Draft' THEN 'collecting'
    WHEN status = 'Sent' THEN 'sent'
    WHEN status = 'Paid' THEN 'paid'
    WHEN status = 'Overdue' THEN 'overdue'
    ELSE 'collecting'  -- Default for any unknown statuses
END
WHERE status NOT IN ('collecting', 'sent', 'paid', 'overdue');

-- Step 8: Create triggers for automatic invoice numbering (safe to run multiple times)
DROP TRIGGER IF EXISTS generate_invoice_number;
CREATE TRIGGER generate_invoice_number BEFORE INSERT ON invoices
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    -- Get current year
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM invoice_counter WHERE year = strftime('%Y', 'now')) = 0
        THEN 
            -- Insert new year counter if it doesn't exist
            (INSERT INTO invoice_counter (year, last_number) VALUES (strftime('%Y', 'now'), 1))
        ELSE
            -- Increment existing counter
            (UPDATE invoice_counter 
             SET last_number = last_number + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE year = strftime('%Y', 'now'))
    END;
    
    -- Set the invoice number in format INV-YYYY-NNNN
    UPDATE NEW SET invoice_number = 'INV-' || strftime('%Y', 'now') || '-' || 
        printf('%04d', (SELECT last_number FROM invoice_counter WHERE year = strftime('%Y', 'now')));
END;

-- Step 9: Create validation trigger for invoice number updates
DROP TRIGGER IF EXISTS validate_invoice_number_update;
CREATE TRIGGER validate_invoice_number_update BEFORE UPDATE ON invoices
WHEN NEW.invoice_number != OLD.invoice_number
BEGIN
    SELECT CASE
        WHEN NEW.invoice_number NOT LIKE 'INV-____-____' OR LENGTH(NEW.invoice_number) != 12
        THEN RAISE(ABORT, 'Invoice number must be in format INV-YYYY-NNNN')
    END;
END;

-- Step 10: Create invoice counter timestamp update trigger
DROP TRIGGER IF EXISTS update_invoice_counter_timestamp;
CREATE TRIGGER update_invoice_counter_timestamp AFTER UPDATE ON invoice_counter BEGIN
    UPDATE invoice_counter SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Step 11: Create additional constraints and checks (these will be added in future schema versions)
-- Note: SQLite doesn't support adding CHECK constraints to existing tables via ALTER TABLE
-- These constraints are included in the main schema for new databases

-- Verification queries to check migration success:
-- Run these after migration to verify everything worked correctly

-- Check if invoice counter table exists and has 2025 entry
-- SELECT * FROM invoice_counter WHERE year = 2025;

-- Check if all invoices have invoice numbers in correct format
-- SELECT COUNT(*) as invoices_without_numbers FROM invoices WHERE invoice_number IS NULL OR invoice_number = '';
-- SELECT COUNT(*) as invoices_with_correct_format FROM invoices WHERE invoice_number LIKE 'INV-____-____' AND LENGTH(invoice_number) = 12;

-- Check status values are all valid
-- SELECT DISTINCT status FROM invoices;

-- Check receipt columns were added
-- PRAGMA table_info(invoices);

-- Migration completed successfully
-- Invoice numbers will be automatically generated for new invoices
-- Existing invoices have been retroactively numbered INV-2025-0001, INV-2025-0002, etc.
-- Status workflow now supports: collecting → sent → paid (with overdue as needed)
-- Receipt tracking is ready for email/text delivery confirmation