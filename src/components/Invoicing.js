import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { jasonBusinessData } from '../data/jasonData';
import SearchableClientDropdown from './SearchableClientDropdown';


function InvoiceList() {
  const {
    invoices,
    paymentMethods,
    getInvoiceById,
    getClientById,
    markInvoicePaid,
    sendInvoice
  } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'month', 'week', 'custom'
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const navigate = useNavigate();

  // Date filtering functions
  const getDateRange = (filter) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    switch (filter) {
      case 'week':
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
      case 'month':
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        };
      case 'custom':
        return {
          start: customDateRange.startDate,
          end: customDateRange.endDate
        };
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Text search filter
    const matchesSearch = invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toString().includes(searchTerm);
    
    // Date filter
    if (dateFilter === 'all') {
      return matchesSearch;
    }
    
    const dateRange = getDateRange(dateFilter);
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return matchesSearch;
    }
    
    const invoiceDate = invoice.date;
    const matchesDate = invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
    
    return matchesSearch && matchesDate;
  });

  const handleSendInvoice = async (invoiceId) => {
    const invoice = getInvoiceById(invoiceId);
    const client = getClientById(invoice.clientId);
    
    // Default to email option
    const method = client && client.email ? 'email' : 'manual';
    await sendInvoice(invoiceId, method);
  };

  const handleMarkPaid = async (invoiceId) => {
    const invoice = getInvoiceById(invoiceId);
    const client = getClientById(invoice.clientId);
    
    // Use existing payment method from client, or default
    const paymentMethod = client?.paymentMethod || paymentMethods[0];
    
    await markInvoicePaid(invoiceId, paymentMethod);
  };

  const handleExportToGoogleSheets = () => {
    alert('Google Sheets export functionality will be implemented. This would export all invoice data for your CPA.');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h1 className="card-title">Invoices</h1>
            <div className="flex gap-2">
              <Link to="/invoicing/create" className="btn btn-primary">
                + Create Invoice
              </Link>
              <button onClick={handleExportToGoogleSheets} className="btn btn-outline">
                📊 Export to Google Sheets
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="mb-6 space-y-4">
            <input
              type="text"
              placeholder="Search invoices by client name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
            />
            
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Filter by Date</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="p-3 border border-gray-300 rounded-md"
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange({...customDateRange, startDate: e.target.value})}
                      className="p-3 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange({...customDateRange, endDate: e.target.value})}
                      className="p-3 border border-gray-300 rounded-md"
                    />
                  </div>
                </>
              )}
              
              <div className="text-sm text-gray-600">
                Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="card">
                <div className="card-content">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">Invoice #{invoice.id}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">{invoice.clientName}</p>
                      <div className="flex gap-6 text-sm text-gray-600">
                        <span><strong>Date:</strong> {invoice.date}</span>
                        <span><strong>Due:</strong> {invoice.dueDate}</span>
                        <span><strong>Total:</strong> ${invoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoicing/${invoice.id}`)}
                          className="btn btn-outline btn-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/invoicing/${invoice.id}/edit`)}
                          className="btn btn-primary btn-sm"
                          disabled={invoice.status === 'Paid'}
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSendInvoice(invoice.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          📧 Send
                        </button>
                        {(invoice.status === 'Pending' || invoice.status === 'Sent') && (
                          <button 
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="btn btn-outline btn-sm"
                          >
                            ✓ Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountInput({ value, onChange, name, placeholder, required = false }) {
  const [inputValue, setInputValue] = useState(value === 0 ? '' : value.toString());

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Convert to number, handling empty string as 0
    const numericValue = newValue === '' ? 0 : parseFloat(newValue) || 0;
    onChange({
      target: {
        name,
        value: numericValue
      }
    });
  };

  const handleFocus = () => {
    // Clear the field if it shows 0
    if (inputValue === '0' || inputValue === '') {
      setInputValue('');
    }
  };

  return (
    <input
      type="number"
      name={name}
      required={required}
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className="w-full p-3 border border-gray-300 rounded-md"
      step="0.01"
      min="0"
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    
    const newInvoice = addInvoice({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      ...invoiceData,
      subtotal,
      tax,
      total
    });
    
    console.log('Created invoice:', newInvoice);
    navigate('/invoicing');
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
              <SearchableClientDropdown
                selectedClient={selectedClient}
                onClientChange={setSelectedClient}
                clients={clients}
              />
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
                  <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
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
    getInvoiceById,
    getClientById,
    markInvoicePaid,
    sendInvoice
  } = useData();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoiceById(parseInt(id));

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
            <h1 className="card-title">Invoice #{invoice.id}</h1>
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
    getInvoiceById,
    getClientById,
    updateInvoice
  } = useData();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoiceById(parseInt(id));
  
  const [selectedClient, setSelectedClient] = useState(
    getClientById(invoice?.clientId)
  );
  const [invoiceData, setInvoiceData] = useState({
    date: invoice?.date || '',
    dueDate: invoice?.dueDate || '',
    services: invoice?.services || [{ description: '', quantity: 1, rate: 0, amount: 0 }]
  });

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
            <h1 className="card-title">Edit Invoice #{invoice.id}</h1>
          </div>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SearchableClientDropdown
                selectedClient={selectedClient}
                onClientChange={setSelectedClient}
                clients={clients}
              />
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
                  <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
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
      <Route path="/:id" element={<InvoiceDetail />} />
      <Route path="/:id/edit" element={<EditInvoice />} />
    </Routes>
  );
}

export default Invoicing;