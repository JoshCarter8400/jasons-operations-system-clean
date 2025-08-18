-- URGENT: Add address column to business_settings table
-- This fixes the "table business_settings has no column named address" error

-- Add address column if it doesn't exist
ALTER TABLE business_settings ADD COLUMN address TEXT DEFAULT '';

-- Verify the column was added
PRAGMA table_info(business_settings);

-- Test updating with address
UPDATE business_settings 
SET address = 'Test Address Update', updated_at = CURRENT_TIMESTAMP 
WHERE id = 1;

-- Verify the update worked
SELECT name, phone, email, address, tax_rate FROM business_settings WHERE id = 1;
