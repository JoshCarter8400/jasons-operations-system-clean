/**
 * Cleanup Empty Collecting Invoices
 * Removes any collecting invoices that were created without line items
 * This fixes the mass invoice creation bug aftermath
 */

import { initializeDatabase, execute } from './database.js';

export const cleanupEmptyCollectingInvoices = async () => {
  try {
    console.log('🧹 Starting cleanup of empty collecting invoices...');
    
    await initializeDatabase();
    
    // Find all collecting invoices with no line items
    const emptyInvoicesResult = await execute(`
      SELECT i.id, i.invoice_number, i.client_id, i.status, i.total
      FROM invoices i
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      WHERE i.status = 'collecting' 
      GROUP BY i.id
      HAVING COUNT(li.id) = 0
      ORDER BY i.created_at DESC
    `);

    const emptyInvoices = emptyInvoicesResult.rows;
    console.log(`📋 Found ${emptyInvoices.length} empty collecting invoices to clean up`);

    if (emptyInvoices.length === 0) {
      console.log('✅ No empty collecting invoices found - database is clean!');
      return {
        cleaned: 0,
        message: 'No empty collecting invoices found'
      };
    }

    // Display what will be deleted
    emptyInvoices.forEach(invoice => {
      console.log(`   🗑️  Invoice ${invoice.invoice_number || invoice.id} (Client ID: ${invoice.client_id}, Total: $${(invoice.total || 0).toFixed(2)})`);
    });

    // Delete the empty invoices
    let deletedCount = 0;
    for (const invoice of emptyInvoices) {
      try {
        await execute('DELETE FROM invoices WHERE id = ?', [invoice.id]);
        deletedCount++;
        console.log(`   ✅ Deleted empty invoice ${invoice.invoice_number || invoice.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete invoice ${invoice.invoice_number || invoice.id}:`, error.message);
      }
    }

    console.log(`🎉 Cleanup complete! Removed ${deletedCount} empty collecting invoices`);
    
    return {
      cleaned: deletedCount,
      total: emptyInvoices.length,
      message: `Successfully removed ${deletedCount} empty collecting invoices`
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
};

// Run cleanup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupEmptyCollectingInvoices()
    .then((result) => {
      console.log(`\\n🎉 Cleanup completed: ${result.message}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}