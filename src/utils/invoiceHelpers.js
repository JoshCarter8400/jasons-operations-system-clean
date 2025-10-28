import { 
  insertInvoiceWithNumber, 
  updateInvoiceStatus, 
  getInvoiceWithLineItems, 
  getInvoiceByNumber,
  getClientInvoices,
  insertInvoiceLineItem,
  updateInvoiceTotals
} from './databaseHelpers.js';

/**
 * Gets a due date one week from now
 * @returns {string} Due date in YYYY-MM-DD format
 */
const getDueDateOneWeekFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

/**
 * Creates or finds a collecting invoice for a client
 * A collecting invoice accumulates multiple services before being sent
 * @param {number} clientId - Client ID
 * @param {Object} clientData - Client data (name, etc.)
 * @returns {Promise<Object>} Collecting invoice object
 */
export async function createCollectingInvoice(clientId, clientData) {
  try {
    // First check if there's already a collecting invoice for this client
    const existingCollecting = await getCollectingInvoiceForClient(clientId);
    
    if (existingCollecting) {
      return existingCollecting;
    }

    // Create new collecting invoice
    const today = new Date();

    const invoiceData = {
      client_id: clientId,
      client_name: clientData.name,
      date: today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
      due_date: getDueDateOneWeekFromNow(),
      status: 'collecting',
      subtotal: 0.0,
      tax: 0.0,
      total: 0.0,
      notes: ''
    };

    const newInvoice = await insertInvoiceWithNumber(invoiceData);

    // CRITICAL FIX: Verify invoice exists in database before returning
    // This ensures the INSERT transaction is fully committed
    const verifiedInvoice = await getInvoiceWithLineItems(newInvoice.id);
    if (!verifiedInvoice) {
      throw new Error(`Failed to verify invoice ${newInvoice.id} in database`);
    }

    return verifiedInvoice;
  } catch (error) {
    console.error('Error creating collecting invoice:', error);
    throw new Error('Failed to create collecting invoice');
  }
}

/**
 * Adds a completed service to an invoice as a line item
 * @param {number} invoiceId - Invoice ID
 * @param {Object} serviceData - Service data { description, quantity, rate, amount }
 * @returns {Promise<boolean>} Success status
 */
export async function addServiceToInvoice(invoiceId, serviceData) {
  try {
    // Add line item
    await insertInvoiceLineItem(invoiceId, serviceData);
    
    // Recalculate invoice totals
    await updateInvoiceTotals(invoiceId);
    
    return true;
  } catch (error) {
    console.error('Error adding service to invoice:', error);
    throw new Error('Failed to add service to invoice');
  }
}

/**
 * Sends a collecting invoice (changes status from collecting to sent)
 * Creates a new collecting invoice for the client automatically
 * @param {number} invoiceId - Invoice ID to send
 * @param {Object} clientData - Client data for creating new collecting invoice
 * @returns {Promise<Object>} Result with sent invoice and new collecting invoice
 */
export async function sendCollectingInvoice(invoiceId, clientData) {
  try {
    // Get the invoice first
    const invoice = await getInvoiceWithLineItems(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }


    if (invoice.status !== 'collecting') {
      throw new Error('Only collecting invoices can be sent');
    }

    if (invoice.total <= 0) {
      throw new Error('Cannot send invoice with zero total');
    }

    // Update invoice status to sent with new due date
    const sentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const newDueDate = getDueDateOneWeekFromNow();
    await updateInvoiceStatus(invoiceId, 'sent', { 
      sent_date: sentDate,
      due_date: newDueDate 
    });

    // Get the invoice again after status update to check if totals changed
    const updatedInvoice = await getInvoiceWithLineItems(invoiceId);

    // Create new collecting invoice for this client
    const newCollectingInvoice = await createCollectingInvoice(invoice.client_id, clientData);

    return {
      sentInvoice: { ...updatedInvoice, status: 'sent', sent_date: sentDate },
      newCollectingInvoice
    };
  } catch (error) {
    console.error('Error sending collecting invoice:', error);
    throw error;
  }
}

/**
 * Marks an invoice as paid and sets up for auto-receipt
 * @param {number} invoiceId - Invoice ID
 * @param {string} paymentMethod - Payment method used
 * @param {string} receiptMethod - How to send receipt (email, text, none)
 * @returns {Promise<Object>} Updated invoice with payment info
 */
export async function markInvoicePaid(invoiceId, paymentMethod, receiptMethod = 'email') {
  try {
    const invoice = await getInvoiceWithLineItems(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    const paidDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const updates = {
      paid_date: paidDate,
      payment_method: paymentMethod,
      receipt_delivery_method: receiptMethod
    };

    // If receipt method is not 'none', we'll set receipt_sent_date when actually sent
    await updateInvoiceStatus(invoiceId, 'paid', updates);

    return {
      ...invoice,
      status: 'paid',
      ...updates
    };
  } catch (error) {
    console.error('Error marking invoice paid:', error);
    throw error;
  }
}

/**
 * Marks an invoice as paid and automatically sends receipt email
 * @param {number} invoiceId - Invoice ID
 * @param {string} paymentMethod - Payment method used
 * @returns {Promise<Object>} Updated invoice with payment info and receipt status
 */
export async function markInvoicePaidWithReceipt(invoiceId, paymentMethod) {
  try {
    // First mark the invoice as paid
    const updatedInvoice = await markInvoicePaid(invoiceId, paymentMethod, 'email');
    
    // Get the client information for email
    const { getClients } = await import('./database.js');
    const { sendPaymentReceiptEmail, createEmailNotification } = await import('../services/emailService.js');
    const clients = await getClients();
    const client = clients.find(c => c.id === updatedInvoice.client_id);
    
    if (!client) {
      console.warn(`Client not found for invoice ${invoiceId}`);
      return updatedInvoice;
    }

    // Send receipt email if client has email
    if (client.email) {
      const businessInfo = {
        name: "Trusting and Affordable Tree Service and Lawn Care",
        email: process.env.REACT_APP_JASON_BUSINESS_EMAIL,
        phone: process.env.REACT_APP_JASON_PHONE_NUMBER
      };

      try {
        const emailResult = await sendPaymentReceiptEmail(
          {
            ...updatedInvoice,
            id: updatedInvoice.invoice_number || updatedInvoice.id,
            paid_date: updatedInvoice.paid_date,
            paidDate: updatedInvoice.paid_date
          },
          client,
          businessInfo,
          paymentMethod
        );

        if (emailResult.success) {
          // Update receipt sent date
          await updateInvoiceStatus(invoiceId, 'paid', { 
            receipt_sent_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
          });
          
          createEmailNotification(
            'email',
            'Receipt Sent!',
            `Payment receipt for Invoice #${updatedInvoice.invoice_number || updatedInvoice.id} sent to ${client.email}`,
            true
          );
        } else {
          createEmailNotification(
            'error',
            'Receipt Email Failed',
            `Could not send receipt to ${client.email}. Please check email address.`,
            false
          );
        }
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
        createEmailNotification(
          'error',
          'Receipt Email Failed',
          `Error sending receipt: ${emailError.message}`,
          false
        );
      }
    } else {
      createEmailNotification(
        'warning',
        'No Email Address',
        `Invoice #${updatedInvoice.invoice_number || updatedInvoice.id} marked as paid - no email address on file for ${client.name}`,
        false
      );
    }

    return updatedInvoice;
  } catch (error) {
    console.error('Error marking invoice paid with receipt:', error);
    throw error;
  }
}

/**
 * Gets an invoice by its invoice number
 * @param {string} invoiceNumber - Invoice number (INV-YYYY-NNNN)
 * @returns {Promise<Object|null>} Invoice object or null if not found
 */
export async function getInvoiceByInvoiceNumber(invoiceNumber) {
  try {
    return await getInvoiceByNumber(invoiceNumber);
  } catch (error) {
    console.error('Error getting invoice by number:', error);
    throw error;
  }
}

/**
 * Gets all invoices for a client, optionally filtered by status
 * @param {number} clientId - Client ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of invoice objects
 */
export async function getAllClientInvoices(clientId, status = null) {
  try {
    return await getClientInvoices(clientId, status);
  } catch (error) {
    console.error('Error getting client invoices:', error);
    throw error;
  }
}

/**
 * Gets the current collecting invoice for a client
 * @param {number} clientId - Client ID
 * @returns {Promise<Object|null>} Collecting invoice or null
 */
export async function getCollectingInvoiceForClient(clientId) {
  try {
    const collectingInvoices = await getAllClientInvoices(clientId, 'collecting');
    return collectingInvoices.length > 0 ? collectingInvoices[0] : null;
  } catch (error) {
    console.error('Error getting collecting invoice for client:', error);
    throw error;
  }
}

/**
 * Combines multiple line items into a single service entry (for cleanup)
 * @param {number} invoiceId - Invoice ID
 * @param {Array} lineItemIds - Array of line item IDs to combine
 * @param {Object} newServiceData - New combined service data
 * @returns {Promise<boolean>} Success status
 */
export async function combineLineItems(invoiceId, lineItemIds, newServiceData) {
  try {
    if (lineItemIds.length < 2) {
      throw new Error('Need at least 2 line items to combine');
    }

    const { deleteInvoiceLineItems } = await import('./databaseHelpers.js');

    // Delete old line items
    await deleteInvoiceLineItems(lineItemIds);

    // Add new combined line item
    await insertInvoiceLineItem(invoiceId, newServiceData);

    // Recalculate totals
    await updateInvoiceTotals(invoiceId);

    return true;
  } catch (error) {
    console.error('Error combining line items:', error);
    throw error;
  }
}

/**
 * Duplicates an invoice for recurring services
 * @param {number} originalInvoiceId - Original invoice ID to duplicate
 * @param {Object} overrides - Fields to override in the duplicate
 * @returns {Promise<Object>} New invoice object
 */
export async function duplicateInvoice(originalInvoiceId, overrides = {}) {
  try {
    const originalInvoice = await getInvoiceWithLineItems(originalInvoiceId);
    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    // Create new invoice data
    const today = new Date();

    const newInvoiceData = {
      client_id: originalInvoice.client_id,
      client_name: originalInvoice.client_name,
      date: today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
      due_date: getDueDateOneWeekFromNow(),
      status: 'collecting',
      subtotal: originalInvoice.subtotal,
      tax: originalInvoice.tax,
      total: originalInvoice.total,
      notes: `Duplicate of ${originalInvoice.invoice_number}`,
      ...overrides
    };

    // Create new invoice
    const newInvoice = await insertInvoiceWithNumber(newInvoiceData);

    // Copy line items
    if (originalInvoice.line_items && originalInvoice.line_items.length > 0) {
      const { insertInvoiceLineItem } = await import('./databaseHelpers.js');
      
      for (const lineItem of originalInvoice.line_items) {
        await insertInvoiceLineItem(newInvoice.id, {
          description: lineItem.description,
          quantity: lineItem.quantity,
          rate: lineItem.rate,
          amount: lineItem.amount
        });
      }
    }

    return newInvoice;
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    throw error;
  }
}

/**
 * Gets overdue invoices (sent but not paid, past due date)
 * @returns {Promise<Array>} Array of overdue invoices
 */
export async function getOverdueInvoices() {
  try {
    const { getOverdueInvoicesList } = await import('./databaseHelpers.js');
    return await getOverdueInvoicesList();
  } catch (error) {
    console.error('Error getting overdue invoices:', error);
    throw error;
  }
}

/**
 * Updates the receipt sent status for an invoice
 * @param {number} invoiceId - Invoice ID
 * @param {string} method - Receipt delivery method (email, text)
 * @returns {Promise<boolean>} Success status
 */
export async function markReceiptSent(invoiceId, method = 'email') {
  try {
    const sentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const updates = {
      receipt_sent_date: sentDate,
      receipt_delivery_method: method
    };

    const { updateInvoiceFields } = await import('./databaseHelpers.js');
    await updateInvoiceFields(invoiceId, updates);

    return true;
  } catch (error) {
    console.error('Error marking receipt sent:', error);
    throw error;
  }
}

/**
 * Gets invoice summary statistics
 * @param {number} year - Optional year filter
 * @returns {Promise<Object>} Summary statistics
 */
export async function getInvoiceSummaryStats(year = null) {
  try {
    const { getInvoiceStats } = await import('./databaseHelpers.js');
    return await getInvoiceStats(year);
  } catch (error) {
    console.error('Error getting invoice summary stats:', error);
    throw error;
  }
}