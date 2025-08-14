/**
 * Invoice Database Integrity Debugging Tool
 * Helps identify orphaned data and inconsistencies causing "Invoice not found" errors
 */

import { createClient as createLibSQLClient } from '@libsql/client';

// Database configuration
const config = {
  url: process.env.REACT_APP_TURSO_DATABASE_URL,
  authToken: process.env.REACT_APP_TURSO_AUTH_TOKEN,
};

/**
 * Comprehensive database integrity check for invoices
 * Identifies orphaned data and inconsistencies
 */
export async function checkInvoiceIntegrity() {
  console.group('🔍 Invoice Database Integrity Check');
  
  try {
    const db = createLibSQLClient(config);
    console.log('✅ Database connection established');
    
    const results = {
      summary: {},
      issues: [],
      recommendations: []
    };
    
    // 1. Check total counts
    const invoiceCount = await db.execute('SELECT COUNT(*) as count FROM invoices');
    const lineItemCount = await db.execute('SELECT COUNT(*) as count FROM invoice_line_items');
    
    results.summary = {
      totalInvoices: invoiceCount.rows[0].count,
      totalLineItems: lineItemCount.rows[0].count
    };
    
    console.log('📊 Database Summary:', results.summary);
    
    // 2. Find invoices without line items (potential orphans)
    const invoicesWithoutLineItems = await db.execute(`
      SELECT i.id, i.invoice_number, i.client_id, i.status, i.total, i.created_at
      FROM invoices i
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      WHERE li.invoice_id IS NULL
      ORDER BY i.created_at DESC
    `);
    
    if (invoicesWithoutLineItems.rows.length > 0) {
      console.warn('⚠️ Invoices without line items found:', invoicesWithoutLineItems.rows.length);
      results.issues.push({
        type: 'orphaned_invoices',
        count: invoicesWithoutLineItems.rows.length,
        details: invoicesWithoutLineItems.rows
      });
    }
    
    // 3. Find line items without parent invoices (orphaned line items)
    const orphanedLineItems = await db.execute(`
      SELECT li.id, li.invoice_id, li.description, li.amount
      FROM invoice_line_items li
      LEFT JOIN invoices i ON li.invoice_id = i.id
      WHERE i.id IS NULL
    `);
    
    if (orphanedLineItems.rows.length > 0) {
      console.warn('⚠️ Orphaned line items found:', orphanedLineItems.rows.length);
      results.issues.push({
        type: 'orphaned_line_items',
        count: orphanedLineItems.rows.length,
        details: orphanedLineItems.rows
      });
    }
    
    // 4. Check for invoices with mismatched totals
    const mismatchedTotals = await db.execute(`
      SELECT 
        i.id,
        i.invoice_number,
        i.total as invoice_total,
        COALESCE(SUM(li.amount), 0) as calculated_total,
        ABS(i.total - COALESCE(SUM(li.amount), 0)) as difference
      FROM invoices i
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      GROUP BY i.id, i.invoice_number, i.total
      HAVING ABS(i.total - COALESCE(SUM(li.amount), 0)) > 0.01
      ORDER BY difference DESC
    `);
    
    if (mismatchedTotals.rows.length > 0) {
      console.warn('⚠️ Invoices with mismatched totals:', mismatchedTotals.rows.length);
      results.issues.push({
        type: 'mismatched_totals',
        count: mismatchedTotals.rows.length,
        details: mismatchedTotals.rows
      });
    }
    
    // 5. Check for duplicate invoice numbers
    const duplicateNumbers = await db.execute(`
      SELECT invoice_number, COUNT(*) as count
      FROM invoices 
      WHERE invoice_number IS NOT NULL
      GROUP BY invoice_number
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateNumbers.rows.length > 0) {
      console.warn('⚠️ Duplicate invoice numbers found:', duplicateNumbers.rows.length);
      results.issues.push({
        type: 'duplicate_numbers',
        count: duplicateNumbers.rows.length,
        details: duplicateNumbers.rows
      });
    }
    
    // 6. List all invoices for reference
    const allInvoices = await db.execute(`
      SELECT 
        i.id,
        i.invoice_number,
        i.client_id,
        i.status,
        i.total,
        i.created_at,
        COUNT(li.id) as line_items_count
      FROM invoices i
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      GROUP BY i.id, i.invoice_number, i.client_id, i.status, i.total, i.created_at
      ORDER BY i.created_at DESC
    `);
    
    console.log('📋 All Invoices in Database:');
    console.table(allInvoices.rows.map(row => ({
      ID: row.id,
      Number: row.invoice_number || 'N/A',
      ClientID: row.client_id,
      Status: row.status,
      Total: `$${row.total}`,
      LineItems: row.line_items_count,
      Created: new Date(row.created_at).toLocaleDateString()
    })));
    
    // 7. Generate recommendations
    if (results.issues.length === 0) {
      results.recommendations.push('✅ No integrity issues found - database is healthy');
    } else {
      if (results.issues.some(i => i.type === 'orphaned_invoices')) {
        results.recommendations.push('🔧 Consider deleting invoices without line items (likely incomplete creates)');
      }
      if (results.issues.some(i => i.type === 'orphaned_line_items')) {
        results.recommendations.push('🔧 Clean up orphaned line items - their parent invoices no longer exist');
      }
      if (results.issues.some(i => i.type === 'mismatched_totals')) {
        results.recommendations.push('🔧 Recalculate totals for invoices with mismatched amounts');
      }
      if (results.issues.some(i => i.type === 'duplicate_numbers')) {
        results.recommendations.push('🔧 Fix duplicate invoice numbers - this can cause lookup issues');
      }
    }
    
    console.log('💡 Recommendations:', results.recommendations);
    console.groupEnd();
    
    return results;
    
  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    console.groupEnd();
    throw error;
  }
}

/**
 * Check if a specific invoice exists and show its related data
 * Useful for debugging specific "Invoice not found" errors
 */
export async function debugSpecificInvoice(invoiceId) {
  console.group(`🔍 Debug Invoice ID: ${invoiceId}`);
  
  try {
    const db = createLibSQLClient(config);
    
    // Check if invoice exists
    const invoice = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    
    console.log('Invoice lookup result:', {
      found: invoice.rows.length > 0,
      data: invoice.rows[0] || null
    });
    
    if (invoice.rows.length === 0) {
      // Invoice not found - check for similar IDs
      const similarIds = await db.execute(`
        SELECT id, invoice_number, status, created_at 
        FROM invoices 
        WHERE id BETWEEN ? AND ? 
        ORDER BY id
      `, [Math.max(1, invoiceId - 5), invoiceId + 5]);
      
      console.log('Similar invoice IDs:', similarIds.rows);
      
      // Check if ID exists as string
      const stringCheck = await db.execute('SELECT * FROM invoices WHERE CAST(id AS TEXT) = ?', [String(invoiceId)]);
      console.log('String ID check:', stringCheck.rows);
      
      return {
        found: false,
        similarIds: similarIds.rows,
        stringMatch: stringCheck.rows
      };
    }
    
    // Invoice found - get line items
    const lineItems = await db.execute('SELECT * FROM invoice_line_items WHERE invoice_id = ?', [invoiceId]);
    
    const result = {
      found: true,
      invoice: invoice.rows[0],
      lineItems: lineItems.rows,
      lineItemCount: lineItems.rows.length
    };
    
    console.log('Complete invoice data:', result);
    console.groupEnd();
    
    return result;
    
  } catch (error) {
    console.error('❌ Debug specific invoice failed:', error);
    console.groupEnd();
    throw error;
  }
}

/**
 * Clean up orphaned data (use with caution)
 * This function can fix common integrity issues
 */
export async function cleanupOrphanedData(options = { dryRun: true }) {
  console.group('🧹 Cleanup Orphaned Data');
  console.warn('⚠️ This will modify database data. Use with caution!');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    const db = createLibSQLClient(config);
    const results = [];
    
    // Find orphaned line items
    const orphanedLineItems = await db.execute(`
      SELECT li.id
      FROM invoice_line_items li
      LEFT JOIN invoices i ON li.invoice_id = i.id
      WHERE i.id IS NULL
    `);
    
    if (orphanedLineItems.rows.length > 0) {
      console.log(`Found ${orphanedLineItems.rows.length} orphaned line items`);
      
      if (!options.dryRun) {
        const deleteResult = await db.execute(`
          DELETE FROM invoice_line_items
          WHERE id IN (${orphanedLineItems.rows.map(() => '?').join(',')})
        `, orphanedLineItems.rows.map(r => r.id));
        
        results.push({
          action: 'deleted_orphaned_line_items',
          count: deleteResult.changes
        });
      }
    }
    
    // Find invoices without line items (excluding collecting status)
    const emptyInvoices = await db.execute(`
      SELECT i.id
      FROM invoices i
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      WHERE li.invoice_id IS NULL 
      AND i.status != 'collecting'
      AND i.total = 0
    `);
    
    if (emptyInvoices.rows.length > 0) {
      console.log(`Found ${emptyInvoices.rows.length} empty non-collecting invoices`);
      
      if (!options.dryRun) {
        const deleteResult = await db.execute(`
          DELETE FROM invoices
          WHERE id IN (${emptyInvoices.rows.map(() => '?').join(',')})
        `, emptyInvoices.rows.map(r => r.id));
        
        results.push({
          action: 'deleted_empty_invoices',
          count: deleteResult.changes
        });
      }
    }
    
    console.log('Cleanup results:', results);
    console.groupEnd();
    
    return results;
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.groupEnd();
    throw error;
  }
}

// Export for use in console debugging
window.debugInvoiceIntegrity = {
  checkIntegrity: checkInvoiceIntegrity,
  debugInvoice: debugSpecificInvoice,
  cleanup: cleanupOrphanedData
};

// Debug tools are available via window.debugInvoiceIntegrity
// Use: checkIntegrity(), debugInvoice(id), cleanup({ dryRun: false })