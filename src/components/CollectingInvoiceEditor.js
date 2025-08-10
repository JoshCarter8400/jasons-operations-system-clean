import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
// import { formatDate } from '../utils/dateUtils'; // Not currently used
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

function CollectingInvoiceEditor() {
  const { 
    getCurrentCollectingInvoice,
    updateServiceInCollectingInvoice,
    removeServiceFromCollectingInvoice,
    addServiceToCollectingInvoice,
    sendCollectingInvoiceToClient,
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
  
  // New service form
  const [newService, setNewService] = useState({
    description: '',
    quantity: 1,
    rate: 0
  });

  // Edit service form
  const [editService, setEditService] = useState({
    description: '',
    quantity: 1,
    rate: 0
  });

  useEffect(() => {
    loadInvoiceData();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!invoice || !invoice.line_items) return { subtotal: 0, tax: 0, total: 0 };
    
    const subtotal = invoice.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * 0.075; // 7.5% tax
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleAddService = async () => {
    try {
      setAdding(true);
      
      if (!newService.description || !newService.rate) {
        alert('Please fill in service description and rate');
        return;
      }

      const updatedInvoice = await addServiceToCollectingInvoice(parseInt(clientId), newService);
      
      // Update local state immediately
      setInvoice(updatedInvoice);
      
      // Reset form
      setNewService({
        description: '',
        quantity: 1,
        rate: 0
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

      const updatedInvoice = await updateServiceInCollectingInvoice(invoice.id, lineItemId, editService);
      
      // Update local state immediately
      setInvoice(updatedInvoice);
      
      // Reset editing state
      setEditing({});
      setEditService({ description: '', quantity: 1, rate: 0 });
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

  const handleSendInvoice = async () => {
    if (!invoice || !invoice.line_items || invoice.line_items.length === 0) {
      alert('Cannot send empty invoice. Add at least one service.');
      return;
    }

    const confirmed = window.confirm(
      `Send invoice to ${client.name}? This will finalize the invoice and create a new collecting invoice.`
    );
    
    if (!confirmed) return;

    try {
      setSending(true);
      await sendCollectingInvoiceToClient(invoice.id);
      navigate('/invoicing');
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const startEditingService = (lineItem) => {
    setEditService({
      description: lineItem.description,
      quantity: lineItem.quantity,
      rate: lineItem.rate
    });
    setEditing({ [lineItem.id]: 'editing' });
  };

  const cancelEditing = () => {
    setEditing({});
    setEditService({ description: '', quantity: 1, rate: 0 });
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
            <h3 className="font-semibold text-lg mb-4">Services</h3>
            
            {invoice.line_items && invoice.line_items.length > 0 ? (
              <div className="space-y-4">
                {invoice.line_items.map((lineItem) => (
                  <div key={lineItem.id} className="border border-gray-200 rounded-md p-4">
                    {editing[lineItem.id] === 'editing' ? (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium mb-2">Service Description</label>
                          <input
                            type="text"
                            value={editService.description}
                            onChange={(e) => setEditService({...editService, description: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-md"
                            list="predefined-services"
                          />
                          <datalist id="predefined-services">
                            {services.map(s => (
                              <option key={s.name} value={s.name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Qty</label>
                          <input
                            type="number"
                            value={editService.quantity}
                            onChange={(e) => setEditService({...editService, quantity: parseFloat(e.target.value) || 1})}
                            className="w-full p-3 border border-gray-300 rounded-md"
                            min="0.1"
                            step="0.1"
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
                                setEditService({...editService, rate: parseFloat(value) || 0});
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full p-3 border border-gray-300 rounded-md"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                            <strong>${((editService.quantity || 0) * (editService.rate || 0) * 1.075).toFixed(2)}</strong>
                            <br /><small>inc. tax</small>
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
                          <h4 className="font-medium">{lineItem.description}</h4>
                          <p className="text-sm text-gray-600">
                            Qty: {lineItem.quantity} × ${lineItem.rate.toFixed(2)} = ${(lineItem.quantity * lineItem.rate * 1.075).toFixed(2)} (inc. 7.5% tax)
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
            )}
          </div>

          {/* Add New Service */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-md">
            <h4 className="font-medium mb-4">Add New Service</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium mb-2">Service Description</label>
                <input
                  type="text"
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="Enter service description"
                  list="predefined-services"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Qty</label>
                <input
                  type="number"
                  value={newService.quantity}
                  onChange={(e) => setNewService({...newService, quantity: parseFloat(e.target.value) || 1})}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  min="0.1"
                  step="0.1"
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
                      setNewService({...newService, rate: parseFloat(value) || 0});
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <strong>${((newService.quantity || 0) * (newService.rate || 0) * 1.075).toFixed(2)}</strong>
                  <br /><small>inc. tax</small>
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
              <div className="flex justify-between">
                <span>Tax (7.5%):</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSendInvoice}
              disabled={sending || !invoice.line_items || invoice.line_items.length === 0}
              className="btn btn-success"
            >
              {sending ? '⏳ Sending...' : '📧 Send Invoice'}
            </button>
            <button
              onClick={() => navigate('/invoicing')}
              className="btn btn-outline"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectingInvoiceEditor;