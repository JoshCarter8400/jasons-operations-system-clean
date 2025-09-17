import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getTodayEasternTime } from '../utils/dateUtils';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import PropertyGroupedInvoiceDisplay from './PropertyGroupedInvoiceDisplay';
import { shouldUsePropertyGrouping } from '../utils/propertyGrouping';

// Helper function to format service description with date
const formatServiceDescription = (description, serviceDate) => {
  if (serviceDate) {
    const date = new Date(serviceDate);
    const formattedDate = date.toLocaleDateString('en-US');
    return `${description} (performed ${formattedDate})`;
  } else {
    return `${description} (Date not recorded)`;
  }
};

function CollectingInvoiceEditor() {
  const { 
    getCurrentCollectingInvoice,
    updateServiceInCollectingInvoice,
    removeServiceFromCollectingInvoice,
    addServiceToCollectingInvoice,
    updateCollectingInvoiceNotes,
    sendCollectingInvoiceToClient,
    deleteInvoice,
    checkCanDeleteInvoice,
    getClientById,
    services
  } = useData();
  
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [updatingNotes, setUpdatingNotes] = useState(false);
  
  // New service form
  const [newService, setNewService] = useState({
    description: '',
    quantity: 1,
    rate: '',
    service_date: getTodayEasternTime()
  });

  // Edit service form
  const [editService, setEditService] = useState({
    description: '',
    quantity: 1,
    rate: '',
    service_date: ''
  });

  useEffect(() => {
    loadInvoiceData();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save notes when component unmounts
  useEffect(() => {
    return () => {
      // Save notes on unmount if there's an invoice
      if (invoice?.id && invoice?.notes !== undefined) {
        updateCollectingInvoiceNotes(invoice.id, invoice.notes || '').catch(error => {
          console.error('❌ Failed to save notes on unmount:', error);
        });
      }
    };
  }, [invoice?.id, invoice?.notes, updateCollectingInvoiceNotes]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const clientData = await getClientById(parseInt(clientId));
      const invoiceData = await getCurrentCollectingInvoice(parseInt(clientId));
      
      setClient(clientData);
      setInvoice(invoiceData);
    } catch (error) {
      console.error('Failed to load invoice data:', error);
      alert('Failed to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!invoice || !invoice.line_items) return { subtotal: 0, total: 0 };
    
    const subtotal = invoice.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = subtotal; // No tax applied
    
    return { subtotal, total };
  };

  const handleAddService = async () => {
    try {
      setAdding(true);
      
      if (!newService.description || !newService.rate) {
        alert('Please fill in service description and rate');
        return;
      }

      // Parse rate to ensure it's a number for the API
      const serviceWithParsedRate = {
        ...newService,
        rate: parseFloat(newService.rate) || 0
      };

      const updatedInvoice = await addServiceToCollectingInvoice(parseInt(clientId), serviceWithParsedRate);
      
      // Update local state immediately
      setInvoice(updatedInvoice);
      
      // Reset form
      setNewService({
        description: '',
        quantity: 1,
        rate: '',
        service_date: getTodayEasternTime()
      });
    } catch (error) {
      console.error('Failed to add service:', error);
      alert('Failed to add service. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleEditService = async (lineItemId) => {
    try {
      setEditing(prev => ({ ...prev, [lineItemId]: true }));
      
      if (!editService.description || !editService.rate) {
        alert('Please fill in service description and rate');
        return;
      }

      // Parse rate to ensure it's a number for the API
      const serviceWithParsedRate = {
        ...editService,
        rate: parseFloat(editService.rate) || 0
      };

      const updatedInvoice = await updateServiceInCollectingInvoice(invoice.id, lineItemId, serviceWithParsedRate);
      
      // Update local state immediately
      setInvoice(updatedInvoice);
      
      // Reset editing state
      setEditing({});
      setEditService({ description: '', quantity: 1, rate: '' });
    } catch (error) {
      console.error('Failed to edit service:', error);
      alert('Failed to edit service. Please try again.');
    } finally {
      setEditing(prev => ({ ...prev, [lineItemId]: false }));
    }
  };

  const handleRemoveService = async (lineItemId, description) => {
    const confirmed = window.confirm(
      `Remove "${description}" from the invoice?`
    );
    
    if (!confirmed) return;

    try {
      setRemoving(prev => ({ ...prev, [lineItemId]: true }));
      const updatedInvoice = await removeServiceFromCollectingInvoice(invoice.id, lineItemId);
      // Update local state immediately
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error('Failed to remove service:', error);
      alert('Failed to remove service. Please try again.');
    } finally {
      setRemoving(prev => ({ ...prev, [lineItemId]: false }));
    }
  };

  const handleNotesChange = (newNotes) => {
    // Only update local state - no database saving during typing
    setInvoice(prev => ({
      ...prev,
      notes: newNotes
    }));
  };

  const saveNotesToDatabase = async () => {
    if (!invoice?.id) return;
    
    try {
      setUpdatingNotes(true);
      
      const result = await updateCollectingInvoiceNotes(invoice.id, invoice.notes || '');
      
      // Check if the update was successful or gracefully skipped
      if (result === null) {
        console.warn('Notes update was skipped - invoice may no longer be in collecting status');
        return; // Gracefully continue without error
      }
      
    } catch (error) {
      console.error('❌ Failed to save notes:', error);
      // Only show alert for unexpected errors, not status change issues
      if (!error.message.includes('collecting')) {
        alert('Failed to save notes. Please try again.');
      }
    } finally {
      setUpdatingNotes(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice || !invoice.line_items || invoice.line_items.length === 0) {
      alert('Cannot send empty invoice. Add at least one service.');
      return;
    }

    if (sending) return; // Prevent multiple simultaneous sends

    const confirmed = window.confirm(
      `Send invoice to ${client.name}? This will finalize the invoice and create a new collecting invoice.`
    );
    
    if (!confirmed) return;

    try {
      setSending(true);
      
      // Save notes before sending (this now handles status changes gracefully)
      console.log('Saving notes before sending invoice...');
      await saveNotesToDatabase();
      
      console.log('Sending invoice...');
      await sendCollectingInvoiceToClient(invoice.id);
      
      console.log('Invoice sent successfully, navigating...');
      navigate('/invoicing');
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      // Save notes before navigating (gracefully handles status changes)
      console.log('Saving notes before closing...');
      await saveNotesToDatabase();
      console.log('Notes saved, navigating...');
      navigate('/invoicing');
    } catch (error) {
      console.error('Failed to save before closing:', error);
      // Navigate anyway since notes are not critical for navigation
      console.log('Navigating despite save error...');
      navigate('/invoicing');
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      
      // First, check if the invoice can be deleted
      const safetyCheck = await checkCanDeleteInvoice(invoice.id);
      
      
      if (!safetyCheck.canDelete) {
        alert(`Cannot Delete Invoice\n\n${safetyCheck.reason}`);
        return;
      }

      // Set up confirmation dialog with detailed invoice info
      setDeleteConfirmation({
        invoice: invoice,
        client: client,
        safetyCheck: safetyCheck
      });
      
    } catch (error) {
      console.error('❌ Error checking delete permission:', error);
      alert('Failed to check delete permission. Please try again.');
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteConfirmation) return;
    
    try {
      setDeleting(true);
      

      const result = await deleteInvoice(invoice.id);
      
      
      if (result.success) {
        // Close confirmation dialog
        setDeleteConfirmation(null);
        
        // Navigate back to invoicing list
        navigate('/invoicing');
        
        alert(`Invoice deleted successfully!\n\nDeleted Invoice #${result.deletedInvoice.invoice_number || invoice.id} for ${client.name}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to delete invoice:', error);
      alert(`Failed to delete invoice: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteInvoice = () => {
    setDeleteConfirmation(null);
  };

  const startEditingService = (lineItem) => {
    setEditService({
      description: lineItem.description,
      quantity: lineItem.quantity,
      rate: lineItem.rate,
      service_date: lineItem.service_date || ''
    });
    setEditing({ [lineItem.id]: 'editing' });
  };

  const cancelEditing = () => {
    setEditing({});
    setEditService({ description: '', quantity: 1, rate: '', service_date: '' });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading collecting invoice...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice || !client) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Invoice not found</p>
          <button onClick={() => navigate('/invoicing')} className="btn btn-primary mt-4">
            Back to Invoicing
          </button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/invoicing')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">
              Collecting Invoice - {client.name}
            </h1>
            <InvoiceStatusBadge status="collecting" size="lg" />
          </div>
        </div>
        
        <div className="card-content">
          {/* Client Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold mb-2">Client Details:</h3>
            <p><strong>Name:</strong> {client.name}</p>
            <p><strong>Address:</strong> {client.address}</p>
            <p><strong>Phone:</strong> {client.phone}</p>
            <p><strong>Email:</strong> {client.email || 'None'}</p>
            <p><strong>Default Service:</strong> {client.serviceType}</p>
          </div>

          {/* Services List */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">
              {shouldUsePropertyGrouping(client, invoice.line_items) ? 'Services by Property' : 'Services'}
            </h3>
            
            {shouldUsePropertyGrouping(client, invoice.line_items) ? (
              /* Property-Grouped Display for Parent Companies */
              <PropertyGroupedInvoiceDisplay
                lineItems={invoice.line_items}
                editing={editing}
                editService={editService}
                services={services}
                removing={removing}
                setEditService={setEditService}
                handleEditService={handleEditService}
                cancelEditing={cancelEditing}
                startEditingService={startEditingService}
                handleRemoveService={handleRemoveService}
              />
            ) : (
              /* Standard Flat Display for Individual Clients */
              invoice.line_items && invoice.line_items.length > 0 ? (
                <div className="space-y-4">
                  {invoice.line_items.map((lineItem) => (
                    <div key={lineItem.id} className="border border-gray-200 rounded-md p-4">
                      {editing[lineItem.id] === 'editing' ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-4">
                            <label className="block text-sm font-medium mb-2">Service Description *</label>
                            <select
                              required
                              value={editService.description}
                              onChange={(e) => setEditService({...editService, description: e.target.value})}
                              className="w-full p-3 border border-gray-300 rounded-md"
                            >
                              <option value="">Select a service...</option>
                              {services.map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Qty</label>
                            <input
                              type="text"
                              required
                              value={editService.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow whole numbers or empty
                                if (value === '' || /^\d+$/.test(value)) {
                                  setEditService({...editService, quantity: value === '' ? '' : parseInt(value)});
                                }
                              }}
                              onKeyDown={(e) => {
                                // Allow backspace, delete, arrow keys, tab
                                if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                  return;
                                }
                                // Only allow digits
                                if (!/^\d$/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className="w-full p-3 border border-gray-300 rounded-md"
                              placeholder=""
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Rate</label>
                            <input
                              type="text"
                              value={editService.rate}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditService({...editService, rate: value});
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full p-3 border border-gray-300 rounded-md"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Service Date</label>
                            <input
                              type="date"
                              value={editService.service_date}
                              onChange={(e) => setEditService({...editService, service_date: e.target.value})}
                              className="w-full p-3 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                              <strong>${((editService.quantity || 0) * (parseFloat(editService.rate) || 0)).toFixed(2)}</strong>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditService(lineItem.id)}
                                disabled={editing[lineItem.id] === true}
                                className="btn btn-primary btn-sm"
                              >
                                {editing[lineItem.id] === true ? '⏳' : '✓'}
                              </button>
                              <button
                                onClick={() => cancelEditing()}
                                className="btn btn-outline btn-sm"
                              >
                                ✗
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-medium">{formatServiceDescription(lineItem.description, lineItem.service_date)}</h4>
                            <p className="text-sm text-gray-600">
                              Qty: {lineItem.quantity} × ${lineItem.rate.toFixed(2)} = ${(lineItem.quantity * lineItem.rate).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditingService(lineItem)}
                              className="btn btn-outline btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveService(lineItem.id, lineItem.description)}
                              disabled={removing[lineItem.id]}
                              className="btn btn-danger btn-sm"
                            >
                              {removing[lineItem.id] ? '⏳ Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No services added yet. Add your first service below.
                </div>
              )
            )}
          </div>

          {/* Add New Service */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-md">
            <h4 className="font-medium mb-4">Add New Service</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium mb-2">Service Description *</label>
                <select
                  required
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select a service...</option>
                  {services.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Qty</label>
                <input
                  type="text"
                  required
                  value={newService.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow whole numbers or empty
                    if (value === '' || /^\d+$/.test(value)) {
                      setNewService({...newService, quantity: value === '' ? '' : parseInt(value)});
                    }
                  }}
                  onKeyDown={(e) => {
                    // Allow backspace, delete, arrow keys, tab
                    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      return;
                    }
                    // Only allow digits
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder=""
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Rate</label>
                <input
                  type="text"
                  value={newService.rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewService({...newService, rate: value});
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Service Date</label>
                <input
                  type="date"
                  value={newService.service_date}
                  onChange={(e) => setNewService({...newService, service_date: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-2">
                <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <strong>${((newService.quantity || 0) * (parseFloat(newService.rate) || 0)).toFixed(2)}</strong>
                </div>
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleAddService}
                  disabled={adding || !newService.description || !newService.rate}
                  className="btn btn-primary btn-sm w-full"
                >
                  {adding ? '⏳ Adding...' : '+ Add Service'}
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="mb-6 bg-gray-50 p-6 rounded-md">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">📝 Invoice Notes</h4>
            <div className="border border-gray-200 rounded-md p-4">
              <label className="block text-sm font-medium mb-2">
                Additional Details or Special Instructions
              </label>
              <textarea
                value={invoice?.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Optional: Enter specific details about this service..."
                className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px]"
                disabled={updatingNotes}
                rows={4}
              />
              {updatingNotes && (
                <div className="mt-2 text-sm text-gray-500">
                  ⏳ Saving notes...
                </div>
              )}
              <div className="mt-2 text-sm text-gray-500">
                Notes are automatically saved as you type and will be included in sent invoices.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-4">
              <button
                onClick={handleSendInvoice}
                disabled={sending || !invoice.line_items || invoice.line_items.length === 0}
                className="btn btn-success"
                title={sending ? 'Sending invoice via email...' : 'Send invoice to client and move to Sent tab'}
              >
                {sending ? '⏳ Sending...' : '📧 Send Invoice'}
              </button>
              <button
                onClick={handleSaveAndClose}
                className="btn btn-outline"
              >
                Save & Close
              </button>
            </div>
            <button
              onClick={handleDeleteInvoice}
              disabled={deleting}
              className="btn btn-danger sm:ml-auto"
            >
              {deleting ? '⏳ Deleting...' : '🗑️ Delete Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Collecting Invoice?
                </h3>
                <div className="text-sm text-gray-600 space-y-3">
                  <p>
                    <strong>Are you sure you want to permanently delete this invoice?</strong>
                  </p>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-red-400">
                    <p><strong>Invoice:</strong> #{deleteConfirmation.invoice.invoice_number || 'Collecting'}</p>
                    <p><strong>Client:</strong> {deleteConfirmation.client.name}</p>
                    <p><strong>Services:</strong> {deleteConfirmation.invoice.line_items ? deleteConfirmation.invoice.line_items.length : 0} items</p>
                    <p><strong>Total:</strong> ${calculateTotals().total.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                    <p className="text-red-700 font-medium">⚠️ This action cannot be undone!</p>
                    <p className="text-red-600 text-xs mt-1">
                      All line items and invoice data will be permanently removed from the database.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelDeleteInvoice}
                className="flex-1 btn btn-outline"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteInvoice}
                disabled={deleting}
                className="flex-1 btn btn-danger"
              >
                {deleting ? '⏳ Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectingInvoiceEditor;