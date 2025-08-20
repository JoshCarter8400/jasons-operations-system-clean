# Manual Invoice Duplicate Prevention Fix Test

## Issue Fixed
- **Problem**: False positive duplicate detection
- **Root Cause**: Duplicate check found empty collecting invoices (no line items) but UI filters them out
- **Result**: Users saw "Collecting (0)" but couldn't create new invoices

## Fix Applied
Changed duplicate prevention logic in `DataContext.js addInvoice()` function to:

1. **Check if existing collecting invoice has line items**
2. **Only prevent creation if invoice has services** (aligns with UI)
3. **Auto-delete empty invoices** when creating new manual invoice
4. **Enhanced error messages** show service count for better UX

## Test Scenarios

### ✅ Scenario 1: No existing collecting invoice
- **Expected**: Manual invoice creation succeeds
- **Result**: New collecting invoice created and appears in UI

### ✅ Scenario 2: Empty collecting invoice exists
- **Expected**: Empty invoice deleted, manual invoice creation succeeds  
- **Result**: Old empty invoice replaced with new manual invoice

### ✅ Scenario 3: Collecting invoice with services exists
- **Expected**: Creation blocked with specific error message
- **Result**: Error shows exact service count and suggests using existing invoice

## Code Changes Made

### Before (Incorrect):
```javascript
const existingCollecting = await getCollectingInvoiceForClient(invoiceData.clientId);
if (existingCollecting) {
  // Shows error even for empty invoices
  throw new Error("Please don't create invoice...");
}
```

### After (Fixed):
```javascript
const existingCollecting = await getCollectingInvoiceForClient(invoiceData.clientId);
if (existingCollecting) {
  const fullInvoice = await getInvoiceWithLineItems(existingCollecting.id);
  
  // Only prevent if has line items (matches UI filtering)
  if (fullInvoice && fullInvoice.line_items && fullInvoice.line_items.length > 0) {
    throw new Error(`...already have a collecting invoice with ${fullInvoice.line_items.length} service(s)...`);
  } else {
    // Delete empty invoice and allow creation
    await deleteInvoiceSafely(existingCollecting.id);
  }
}
```

## Verification
The duplicate check now perfectly aligns with UI logic:
- **UI shows**: Only collecting invoices with line items
- **Duplicate check prevents**: Only when line items exist
- **Empty invoices**: Automatically cleaned up during creation

This eliminates the false positive and maintains proper business rules.