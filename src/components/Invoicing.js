import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { jasonBusinessData } from '../data/jasonData';
import CollectingInvoiceEditor from './CollectingInvoiceEditor';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';


function InvoiceList() {
  const {
    getAllCollectingInvoices,
    getAllDatabaseInvoices,
    sendCollectingInvoiceToClient,
    markCollectingInvoicePaid,
    paymentMethods
  } = useData();
  
  const [collectingInvoices, setCollectingInvoices] = useState([]);
  const [databaseInvoices, setDatabaseInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('collecting'); // 'collecting', 'sent', 'paid'
  const [sending, setSending] = useState({});
  const [markingPaid, setMarkingPaid] = useState({});
  
  const navigate = useNavigate();

  useEffect(() => {
    loadAllInvoices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllInvoices = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading all invoices...');
      
      const [collecting, database] = await Promise.all([
        getAllCollectingInvoices(),
        getAllDatabaseInvoices()
      ]);
      
      console.log('📋 Collecting invoices:', collecting.length);
      console.log('📋 Database invoices:', database.length);
      
      setCollectingInvoices(collecting);
      setDatabaseInvoices(database);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSendCollectingInvoice = async (invoice) => {
    const confirmed = window.confirm(
      `Send invoice to ${invoice.client_name}? This will finalize the invoice.`
    );
    
    if (!confirmed) return;

    try {
      setSending(prev => ({ ...prev, [invoice.id]: true }));
      await sendCollectingInvoiceToClient(invoice.id);
      
      // Immediately refresh all invoice data
      const [collecting, database] = await Promise.all([
        getAllCollectingInvoices(),
        getAllDatabaseInvoices()
      ]);
      
      setCollectingInvoices(collecting);
      setDatabaseInvoices(database);
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
    } finally {
      setSending(prev => ({ ...prev, [invoice.id]: false }));
    }
  };

  const handleMarkPaid = async (invoiceId, invoiceNumber) => {
    const paymentMethod = paymentMethods[0] || 'Cash';
    const confirmed = window.confirm(
      `Mark Invoice #${invoiceNumber} as paid? Payment method: ${paymentMethod}`
    );
    
    if (!confirmed) return;

    try {
      setMarkingPaid(prev => ({ ...prev, [invoiceId]: true }));
      
      if (activeTab === 'collecting') {
        await markCollectingInvoicePaid(invoiceId, paymentMethod);
      } else {
        // For database invoices (sent/paid), use the database helper directly
        const { updateInvoiceStatus } = await import('../utils/databaseHelpers');
        const paidDate = new Date().toISOString().split('T')[0];
        await updateInvoiceStatus(invoiceId, 'paid', { 
          paid_date: paidDate,
          payment_method: paymentMethod 
        });
      }
      
      // Refresh all data
      await loadAllInvoices();
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      alert('Failed to mark invoice as paid. Please try again.');
    } finally {
      setMarkingPaid(prev => ({ ...prev, [invoiceId]: false }));
    }
  };


  const getDisplayInvoices = () => {
    let displayInvoices = [];
    
    if (activeTab === 'collecting') {
      displayInvoices = collectingInvoices;
    } else {
      // Use database invoices for sent/paid tabs
      displayInvoices = databaseInvoices.filter(inv => {
        if (activeTab === 'sent') return inv.status === 'Sent';
        if (activeTab === 'paid') return inv.status === 'Paid';
        return true;
      });
    }

    if (searchTerm) {
      displayInvoices = displayInvoices.filter(invoice =>
        (invoice.client_name || invoice.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.id && invoice.id.toString().includes(searchTerm))
      );
    }

    console.log(`📊 Display invoices for ${activeTab} tab:`, displayInvoices.length);
    return displayInvoices;
  };

  const displayInvoices = getDisplayInvoices();

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading invoices...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Jason's Invoice Management</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/invoicing/create" className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 min-h-[44px] py-3 px-4 font-medium rounded-lg transition-colors">
                + Manual Invoice
              </Link>
              <button 
                onClick={loadAllInvoices}
                className="bg-gray-500 text-white hover:bg-gray-600 min-h-[44px] py-3 px-4 font-medium rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('collecting')}
                className={`px-6 py-4 font-medium min-h-[50px] flex-1 sm:flex-none text-base border-2 border-transparent rounded-lg transition-all duration-200 hover:shadow-md active:scale-95 ${
                  activeTab === 'collecting'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📋 Collecting ({collectingInvoices.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-6 py-4 font-medium min-h-[50px] flex-1 sm:flex-none text-base border-2 border-transparent rounded-lg transition-all duration-200 hover:shadow-md active:scale-95 ${
                  activeTab === 'sent'
                    ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📧 Sent ({databaseInvoices.filter(i => i.status === 'Sent').length})
              </button>
              <button
                onClick={() => setActiveTab('paid')}
                className={`px-6 py-4 font-medium min-h-[50px] flex-1 sm:flex-none text-base border-2 border-transparent rounded-lg transition-all duration-200 hover:shadow-md active:scale-95 ${
                  activeTab === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                ✅ Paid ({databaseInvoices.filter(i => i.status === 'Paid').length})
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search invoices by client name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 text-lg border border-gray-300 rounded-md min-h-[48px]"
            />
          </div>

          {/* Collecting Invoices View */}
          {activeTab === 'collecting' && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <h3 className="font-semibold text-blue-800">Collecting Invoices - Jason's Active Workflow</h3>
                <p className="text-blue-700 text-sm">
                  These invoices are accumulating services. Edit them freely, then send when ready.
                </p>
              </div>
              
              <div className="grid gap-4">
                {displayInvoices.map((invoice) => (
                  <div key={invoice.id} className="card border-l-4 border-blue-400">
                    <div className="card-content">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="font-semibold text-lg">{invoice.client_name}</h3>
                            <InvoiceStatusBadge status="collecting" size="md" />
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Invoice:</strong> #{invoice.invoice_number || invoice.id}</p>
                            <p><strong>Services:</strong> {invoice.line_items ? invoice.line_items.length : 0}</p>
                            <p><strong>Subtotal:</strong> ${(invoice.subtotal || 0).toFixed(2)}</p>
                            <p><strong>Tax (7.5%):</strong> ${(invoice.tax || 0).toFixed(2)}</p>
                            <p><strong>Total:</strong> <strong>${(invoice.total || 0).toFixed(2)}</strong></p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => navigate(`/invoicing/collecting/${invoice.client_id}`)}
                            className="btn btn-primary min-h-[44px] py-3 px-4 font-medium"
                          >
                            📝 Edit Invoice
                          </button>
                          <button
                            onClick={() => handleSendCollectingInvoice(invoice)}
                            disabled={sending[invoice.id] || !invoice.line_items || invoice.line_items.length === 0}
                            className="btn btn-success min-h-[44px] py-3 px-4 font-medium"
                          >
                            {sending[invoice.id] ? '⏳ Sending...' : '📧 Send Invoice'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {displayInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No collecting invoices yet.</p>
                    <p className="text-sm">Mark services complete from Client Management to start collecting.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sent/Paid Invoices View */}
          {(activeTab === 'sent' || activeTab === 'paid') && (
            <div className="grid gap-4">
              {displayInvoices.map((invoice) => (
                <div key={invoice.id} className="card">
                  <div className="card-content">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">Invoice #{invoice.invoice_number || invoice.id}</h3>
                          <InvoiceStatusBadge status={invoice.status} size="sm" />
                        </div>
                        <p className="text-gray-600 mb-1">{invoice.clientName || invoice.client_name}</p>
                        <div className="flex gap-6 text-sm text-gray-600">
                          <span><strong>Date:</strong> {invoice.date}</span>
                          <span><strong>Due:</strong> {invoice.due_date || invoice.dueDate}</span>
                          <span><strong>Total:</strong> ${(invoice.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => navigate(`/invoicing/${invoice.id}`)}
                            className="btn btn-outline min-h-[44px] py-3 px-4 font-medium"
                          >
                            👁️ View
                          </button>
                          {invoice.status !== 'Paid' && (
                            <button
                              onClick={() => handleMarkPaid(invoice.id, invoice.invoice_number || invoice.id)}
                              disabled={markingPaid[invoice.id]}
                              className="btn btn-success min-h-[44px] py-3 px-4 font-medium"
                            >
                              {markingPaid[invoice.id] ? '⏳ Processing...' : '✓ Mark Paid'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {displayInvoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No {activeTab} invoices found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AmountInput({ value, onChange, name, placeholder, required = false }) {
  const [inputValue, setInputValue] = useState(value === 0 ? '' : value.toString());

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Only allow numbers and decimal point
    if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
      setInputValue(newValue);
      
      // Convert to number, handling empty string as 0
      const numericValue = newValue === '' ? 0 : parseFloat(newValue) || 0;
      onChange({
        target: {
          name,
          value: numericValue
        }
      });
    }
  };

  const handleFocus = (e) => {
    // Select all text for easy replacement
    e.target.select();
  };

  return (
    <input
      type="text"
      name={name}
      required={required}
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className="w-full p-3 border border-gray-300 rounded-md"
    />
  );
}

function CreateInvoice() {
  const {
    clients,
    services,
    businessInfo,
    getClientById,
    addInvoice
  } = useData();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedClientId = searchParams.get('client');
  const preselectedClient = preselectedClientId ? 
    getClientById(parseInt(preselectedClientId)) : null;

  const [selectedClient, setSelectedClient] = useState(preselectedClient);
  const [invoiceData, setInvoiceData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    services: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
  });

  const handleInputChange = (e) => {
    setInvoiceData({
      ...invoiceData,
      [e.target.name]: e.target.value
    });
  };

  const handleServiceChange = (index, field, value) => {
    const newServices = [...invoiceData.services];
    newServices[index][field] = value;
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      newServices[index].amount = newServices[index].quantity * newServices[index].rate;
    }
    
    setInvoiceData({
      ...invoiceData,
      services: newServices
    });
  };

  const addService = () => {
    setInvoiceData({
      ...invoiceData,
      services: [...invoiceData.services, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeService = (index) => {
    if (invoiceData.services.length > 1) {
      const newServices = invoiceData.services.filter((_, i) => i !== index);
      setInvoiceData({
        ...invoiceData,
        services: newServices
      });
    }
  };

  const selectPredefinedService = (index, serviceName) => {
    const service = services.find(s => s.name === serviceName);
    if (service) {
      handleServiceChange(index, 'description', service.name);
      handleServiceChange(index, 'rate', service.defaultRate);
    }
  };

  const subtotal = invoiceData.services.reduce((sum, service) => sum + service.amount, 0);
  const taxRate = businessInfo.taxRate;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    
    try {
      const newInvoice = await addInvoice({
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        ...invoiceData,
        subtotal,
        tax,
        total
      });
      
      console.log('✅ Created invoice:', newInvoice.invoice_number);
      alert(`Invoice ${newInvoice.invoice_number} created successfully!`);
      navigate('/invoicing');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/invoicing')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Create New Invoice</h1>
          </div>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Client *</label>
                <select 
                  value={selectedClient?.id || ''} 
                  onChange={(e) => {
                    const selectedClientData = clients.find(c => c.id === parseInt(e.target.value));
                    setSelectedClient(selectedClientData);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.area} - {client.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Invoice Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={invoiceData.date}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  value={invoiceData.dueDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Services</h3>
                <button
                  type="button"
                  onClick={addService}
                  className="btn btn-outline btn-sm"
                >
                  + Add Service
                </button>
              </div>
              
              {invoiceData.services.map((service, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium mb-2">Service Description *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={service.description}
                          onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md"
                          placeholder="Enter service description"
                          list={`services-${index}`}
                        />
                        <datalist id={`services-${index}`}>
                          {services.map(s => (
                            <option key={s.name} value={s.name} />
                          ))}
                        </datalist>
                        <div className="absolute right-2 top-3">
                          <select
                            value=""
                            onChange={(e) => selectPredefinedService(index, e.target.value)}
                            className="border-none bg-transparent text-sm"
                          >
                            <option value="">Quick Select</option>
                            {services.map(s => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Qty *</label>
                      <AmountInput
                        value={service.quantity}
                        onChange={(e) => handleServiceChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        name="quantity"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Rate *</label>
                      <AmountInput
                        value={service.rate}
                        onChange={(e) => handleServiceChange(index, 'rate', e.target.value)}
                        name="rate"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                        ${service.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      {invoiceData.services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="btn btn-outline btn-sm w-full"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-md">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Florida Sales Tax (7.5%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary">
                Create Invoice
              </button>
              <button
                type="button"
                onClick={() => navigate('/invoicing')}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetail() {
  const {
    paymentMethods,
    getClientById,
    markInvoicePaid,
    sendInvoice,
    getAllDatabaseInvoices
  } = useData();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const databaseInvoices = await getAllDatabaseInvoices();
        const foundInvoice = databaseInvoices.find(inv => inv.id === parseInt(id));
        setInvoice(foundInvoice);
      } catch (error) {
        console.error('Failed to load invoice:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInvoice();
  }, [id, getAllDatabaseInvoices]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading invoice...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Invoice not found</p>
          <button onClick={() => navigate('/invoicing')} className="btn btn-primary mt-4">
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const handleSendInvoice = async () => {
    const client = getClientById(invoice.clientId);
    const method = client && client.email ? 'email' : 'manual';
    await sendInvoice(invoice.id, method);
  };

  const handleMarkPaid = async () => {
    const client = getClientById(invoice.clientId);
    
    // Use existing payment method from client, or default
    const paymentMethod = client?.paymentMethod || paymentMethods[0];
    
    await markInvoicePaid(invoice.id, paymentMethod);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => navigate('/invoicing')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Invoice #{invoice.invoice_number || invoice.id}</h1>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => navigate(`/invoicing/${invoice.id}/edit`)}
                className="btn btn-primary"
                disabled={invoice.status === 'Paid'}
              >
                Edit Invoice
              </button>
              <button onClick={handleSendInvoice} className="btn btn-secondary">
                📧 Send Invoice
              </button>
              {(invoice.status === 'Pending' || invoice.status === 'Sent') && (
                <button onClick={handleMarkPaid} className="btn btn-outline">
                  ✓ Mark Paid
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Bill To:</h3>
              <div className="space-y-1">
                <p className="font-medium">{invoice.clientName}</p>
                <p className="text-gray-600">
                  {getClientById(invoice.clientId)?.address}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Invoice Details:</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Date:</span>
                  <span>{invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span>{invoice.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Services:</h3>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-right p-4 font-medium">Qty</th>
                    <th className="text-right p-4 font-medium">Rate</th>
                    <th className="text-right p-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.services.map((service, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="p-4">{service.description}</td>
                      <td className="p-4 text-right">{service.quantity}</td>
                      <td className="p-4 text-right">${service.rate.toFixed(2)}</td>
                      <td className="p-4 text-right">${service.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({(jasonBusinessData.businessInfo.taxRate * 100).toFixed(1)}%):</span>
                <span>${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditInvoice() {
  const {
    clients,
    services,
    businessInfo,
    getClientById,
    updateInvoice,
    getAllDatabaseInvoices
  } = useData();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const databaseInvoices = await getAllDatabaseInvoices();
        const foundInvoice = databaseInvoices.find(inv => inv.id === parseInt(id));
        setInvoice(foundInvoice);
      } catch (error) {
        console.error('Failed to load invoice:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInvoice();
  }, [id, getAllDatabaseInvoices]);
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    date: '',
    dueDate: '',
    services: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
  });

  useEffect(() => {
    if (invoice) {
      setSelectedClient(getClientById(invoice.clientId));
      setInvoiceData({
        date: invoice.date || '',
        dueDate: invoice.dueDate || '',
        services: invoice.services || [{ description: '', quantity: 1, rate: 0, amount: 0 }]
      });
    }
  }, [invoice, getClientById]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading invoice...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Invoice not found</p>
          <button onClick={() => navigate('/invoicing')} className="btn btn-primary mt-4">
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (invoice.status === 'Paid') {
    return (
      <div className="card">
        <div className="card-content">
          <p>Cannot edit paid invoices</p>
          <button onClick={() => navigate(`/invoicing/${invoice.id}`)} className="btn btn-primary mt-4">
            Back to Invoice
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setInvoiceData({
      ...invoiceData,
      [e.target.name]: e.target.value
    });
  };

  const handleServiceChange = (index, field, value) => {
    const newServices = [...invoiceData.services];
    newServices[index][field] = value;
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      newServices[index].amount = newServices[index].quantity * newServices[index].rate;
    }
    
    setInvoiceData({
      ...invoiceData,
      services: newServices
    });
  };

  const addService = () => {
    setInvoiceData({
      ...invoiceData,
      services: [...invoiceData.services, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeService = (index) => {
    if (invoiceData.services.length > 1) {
      const newServices = invoiceData.services.filter((_, i) => i !== index);
      setInvoiceData({
        ...invoiceData,
        services: newServices
      });
    }
  };

  const selectPredefinedService = (index, serviceName) => {
    const service = services.find(s => s.name === serviceName);
    if (service) {
      handleServiceChange(index, 'description', service.name);
      handleServiceChange(index, 'rate', service.defaultRate);
    }
  };

  const subtotal = invoiceData.services.reduce((sum, service) => sum + service.amount, 0);
  const taxRate = businessInfo.taxRate;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    
    const updatedInvoice = updateInvoice(invoice.id, {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      ...invoiceData,
      subtotal,
      tax,
      total
    });
    
    console.log('Updated invoice:', updatedInvoice);
    navigate(`/invoicing/${invoice.id}`);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/invoicing/${invoice.id}`)} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Edit Invoice #{invoice.invoice_number || invoice.id}</h1>
          </div>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Client *</label>
                <select 
                  value={selectedClient?.id || ''} 
                  onChange={(e) => {
                    const selectedClientData = clients.find(c => c.id === parseInt(e.target.value));
                    setSelectedClient(selectedClientData);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.area} - {client.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Invoice Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={invoiceData.date}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  value={invoiceData.dueDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Services</h3>
                <button
                  type="button"
                  onClick={addService}
                  className="btn btn-outline btn-sm"
                >
                  + Add Service
                </button>
              </div>
              
              {invoiceData.services.map((service, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium mb-2">Service Description *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={service.description}
                          onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md"
                          placeholder="Enter service description"
                          list={`services-${index}`}
                        />
                        <datalist id={`services-${index}`}>
                          {services.map(s => (
                            <option key={s.name} value={s.name} />
                          ))}
                        </datalist>
                        <div className="absolute right-2 top-3">
                          <select
                            value=""
                            onChange={(e) => selectPredefinedService(index, e.target.value)}
                            className="border-none bg-transparent text-sm"
                          >
                            <option value="">Quick Select</option>
                            {services.map(s => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Qty *</label>
                      <AmountInput
                        value={service.quantity}
                        onChange={(e) => handleServiceChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        name="quantity"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Rate *</label>
                      <AmountInput
                        value={service.rate}
                        onChange={(e) => handleServiceChange(index, 'rate', e.target.value)}
                        name="rate"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                        ${service.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      {invoiceData.services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="btn btn-outline btn-sm w-full"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-md">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Florida Sales Tax (7.5%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary">
                Update Invoice
              </button>
              <button
                type="button"
                onClick={() => navigate(`/invoicing/${invoice.id}`)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Invoicing() {
  return (
    <Routes>
      <Route path="/" element={<InvoiceList />} />
      <Route path="/create" element={<CreateInvoice />} />
      <Route path="/collecting/:clientId" element={<CollectingInvoiceEditor />} />
      <Route path="/:id" element={<InvoiceDetail />} />
      <Route path="/:id/edit" element={<EditInvoice />} />
    </Routes>
  );
}

export default Invoicing;