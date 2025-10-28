import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import CollectingInvoiceEditor from './CollectingInvoiceEditor';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { shouldUsePropertyGrouping } from '../utils/propertyGrouping';
import { isMultiPropertyInvoice, groupServicesByProperty } from '../utils/multiPropertyHelpers';


function InvoiceList() {
  const {
    getAllCollectingInvoices,
    getAllDatabaseInvoices,
    sendCollectingInvoiceToClient,
    markCollectingInvoicePaid,
    deleteInvoice,
    checkCanDeleteInvoice,
    paymentMethods,
    getClientById
  } = useData();
  
  const [collectingInvoices, setCollectingInvoices] = useState([]);
  const [databaseInvoices, setDatabaseInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('collecting'); // 'collecting', 'sent', 'paid'
  const [sending, setSending] = useState({});
  const [deleting, setDeleting] = useState({});
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [markingPaid, setMarkingPaid] = useState({});
  
  // Paid invoice filters
  const [paidInvoiceFilters, setPaidInvoiceFilters] = useState({
    clientName: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showPaidFilters, setShowPaidFilters] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Conservative fix: Initial load with better timing
    const initialLoad = async () => {
      try {
        // Set loading but keep any existing data visible during load
        setLoading(true);
        await loadAllInvoices(false); // false = don't force refresh on initial load
      } catch (error) {
        console.error('Initial invoice load failed:', error);
      }
    };
    
    initialLoad();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if we need to refresh after navigation from manual invoice creation
  useEffect(() => {
    if (location.state?.refreshInvoices) {
      loadAllInvoices(true); // Force refresh
      setActiveTab('collecting'); // Switch to collecting tab to show new invoice
      
      // Clear the state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove window focus refresh to eliminate unnecessary database calls
  // The component now uses efficient state updates instead of full refreshes

  const loadAllInvoices = async (forceRefresh = false) => {
    try {
      // Conservative fix: Use different loading states for initial load vs refresh
      if (collectingInvoices.length === 0 && databaseInvoices.length === 0) {
        setLoading(true); // Show full loading for initial load
      } else {
        setRefreshing(true); // Show refresh indicator for subsequent loads
      }
      
      const [collecting, database] = await Promise.all([
        getAllCollectingInvoices(forceRefresh),
        getAllDatabaseInvoices()
      ]);
      
      
      // Conservative fix: Only update state if we have valid data
      // This prevents temporary disappearing of collecting invoices during refresh
      if (collecting !== null && collecting !== undefined) {
        setCollectingInvoices(collecting);
      }
      if (database !== null && database !== undefined) {
        setDatabaseInvoices(database);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
      // On error, don't clear existing data - keep what we have
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleSendCollectingInvoice = async (invoice) => {
    const confirmed = window.confirm(
      `Send invoice to ${invoice.client_name}? This will finalize the invoice.`
    );
    
    if (!confirmed) return;

    try {
      setSending(prev => ({ ...prev, [invoice.id]: true }));
      
      // Optimistic update: immediately remove from collecting invoices UI
      setCollectingInvoices(prev => {
        const filtered = prev.filter(inv => inv.id !== invoice.id);
        return filtered;
      });
      
      const result = await sendCollectingInvoiceToClient(invoice.id);
      
      // Show immediate success feedback and add to database invoices
      if (result.uiUpdateData) {
        const { sentInvoice, clientName } = result.uiUpdateData;
        
        // Add to database invoices for Sent tab with optimistic update
        setDatabaseInvoices(prev => [{
          id: sentInvoice.id,
          invoice_number: sentInvoice.invoice_number,
          clientId: sentInvoice.client_id,
          clientName: clientName,
          date: sentInvoice.date,
          dueDate: sentInvoice.due_date,
          status: 'Sent',
          services: sentInvoice.line_items || [],
          subtotal: sentInvoice.subtotal,
          tax: sentInvoice.tax,
          total: sentInvoice.total,
          notes: sentInvoice.notes,
          sentDate: sentInvoice.sent_date,
          paidDate: sentInvoice.paid_date,
          paymentMethod: sentInvoice.payment_method
        }, ...prev]);

        alert(`✅ Success!\n\nInvoice #${sentInvoice.invoice_number} sent to ${clientName}!\n\nThe invoice has been moved to the Sent tab.`);
      }
      
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
      
      // Revert optimistic update on error - add invoice back to collecting list
      setCollectingInvoices(prev => [...prev, invoice]);
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
        // Remove from collecting invoices with optimistic update
        setCollectingInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      } else {
        // For database invoices (sent/paid), use the enhanced helper that sends receipt emails
        const { markInvoicePaidWithReceipt } = await import('../utils/invoiceHelpers');
        await markInvoicePaidWithReceipt(invoiceId, paymentMethod);
        
        // Optimistic update: move invoice from Sent to Paid status
        setDatabaseInvoices(prev => prev.map(inv => 
          inv.id === invoiceId 
            ? { ...inv, status: 'Paid', paidDate: new Date().toISOString().split('T')[0], paymentMethod }
            : inv
        ));
        
        // Switch to Paid tab to show the updated invoice
        setActiveTab('paid');
      }
      
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      alert('Failed to mark invoice as paid. Please try again.');
    } finally {
      setMarkingPaid(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleDeleteInvoice = async (invoice) => {
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
        safetyCheck: safetyCheck
      });
      
    } catch (error) {
      console.error('Error checking delete permission:', error);
      alert('Failed to check delete permission. Please try again.');
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteConfirmation) return;
    
    const { invoice } = deleteConfirmation;
    
    try {
      setDeleting(prev => ({ ...prev, [invoice.id]: true }));
      
      const result = await deleteInvoice(invoice.id);
      
      if (result.success) {
        // Close confirmation dialog
        setDeleteConfirmation(null);
        
        // Optimistic update: remove invoice from collecting invoices
        setCollectingInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        
        alert(`Invoice deleted successfully!\n\nDeleted Invoice #${result.deletedInvoice.invoice_number || invoice.id} for ${result.deletedInvoice.client_name}`);
      }
      
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert(`Failed to delete invoice: ${error.message}`);
    } finally {
      setDeleting(prev => ({ ...prev, [invoice.id]: false }));
    }
  };

  const cancelDeleteInvoice = () => {
    setDeleteConfirmation(null);
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

    // Apply search term filter
    if (searchTerm) {
      displayInvoices = displayInvoices.filter(invoice =>
        (invoice.client_name || invoice.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.id && invoice.id.toString().includes(searchTerm))
      );
    }

    // Apply paid invoice filters (only for paid tab)
    if (activeTab === 'paid') {
      // Client name filter
      if (paidInvoiceFilters.clientName) {
        displayInvoices = displayInvoices.filter(invoice =>
          (invoice.client_name || invoice.clientName || '').toLowerCase().includes(paidInvoiceFilters.clientName.toLowerCase())
        );
      }

      // Date range filter (using paid_date or fallback to date)
      if (paidInvoiceFilters.dateFrom || paidInvoiceFilters.dateTo) {
        displayInvoices = displayInvoices.filter(invoice => {
          // Use paid_date if available, otherwise fall back to invoice date
          const invoiceDate = invoice.paid_date || invoice.paidDate || invoice.date;
          if (!invoiceDate) return true; // Include if no date available
          
          // Check date range
          if (paidInvoiceFilters.dateFrom && invoiceDate < paidInvoiceFilters.dateFrom) {
            return false;
          }
          if (paidInvoiceFilters.dateTo && invoiceDate > paidInvoiceFilters.dateTo) {
            return false;
          }
          return true;
        });
      }
    }

    // Sort sent invoices: overdue first, then by due date
    if (activeTab === 'sent') {
      displayInvoices = displayInvoices.sort((a, b) => {
        // Both overdue or both not overdue - sort by due date
        if (a.isOverdue === b.isOverdue) {
          const dateA = new Date(a.due_date || a.dueDate);
          const dateB = new Date(b.due_date || b.dueDate);
          return dateA - dateB;
        }
        // Overdue invoices come first
        return b.isOverdue ? 1 : -1;
      });
    }

    return displayInvoices;
  };

  const displayInvoices = getDisplayInvoices();
  
  // Calculate total paid invoices before filtering (for "Showing X of Y" message)
  const totalPaidInvoices = databaseInvoices.filter(i => i.status === 'Paid').length;
  
  // Check if any filters are active
  const hasActiveFilters = paidInvoiceFilters.clientName || paidInvoiceFilters.dateFrom || paidInvoiceFilters.dateTo;
  
  // Clear all paid invoice filters
  const clearPaidFilters = () => {
    setPaidInvoiceFilters({
      clientName: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <div className="text-gray-600 text-lg">Loading invoices...</div>
            <div className="text-gray-500 text-sm mt-2">Please wait while we load your invoice data</div>
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
              <Link to="/invoicing/create" className="btn btn-primary">
                + Manual Invoice
              </Link>
              <button 
                onClick={() => loadAllInvoices(true)}
                disabled={refreshing}
                className="btn btn-outline"
                title="Refresh all invoice data from database"
              >
                {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Refreshing indicator */}
          {refreshing && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-700 text-sm">Refreshing invoice data...</span>
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('collecting')}
                className="btn btn-primary min-h-[44px] py-3 px-4 font-medium"
              >
                📋 Collecting ({collectingInvoices.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className="btn btn-outline min-h-[44px] py-3 px-4 font-medium"
              >
                📧 Sent ({databaseInvoices.filter(i => i.status === 'Sent').length})
              </button>
              <button
                onClick={() => setActiveTab('paid')}
                className="btn btn-success min-h-[44px] py-3 px-4 font-medium relative"
              >
                ✓ Paid ({databaseInvoices.filter(i => i.status === 'Paid').length})
                {activeTab === 'paid' && hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    Filtered
                  </span>
                )}
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
                  <div key={`collecting-${invoice.id}`} className="card border-l-4 border-blue-400">
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
                            <p><strong>Total:</strong> <strong>${(invoice.subtotal || 0).toFixed(2)}</strong></p>
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
                            onClick={() => handleDeleteInvoice(invoice)}
                            disabled={deleting[invoice.id]}
                            className="btn btn-danger min-h-[44px] py-3 px-4 font-medium"
                          >
                            {deleting[invoice.id] ? '⏳ Deleting...' : '🗑️ Delete Invoice'}
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
            <div>
              {/* Sent Invoices Overdue Summary */}
              {activeTab === 'sent' && (
                <div className="mb-6">
                  {(() => {
                    const sentInvoices = databaseInvoices.filter(i => i.status === 'Sent');
                    const overdueCount = sentInvoices.filter(i => i.isOverdue).length;
                    const totalSent = sentInvoices.length;
                    
                    if (totalSent > 0) {
                      return (
                        <div className={`p-4 rounded-lg border-l-4 ${
                          overdueCount > 0 
                            ? 'bg-red-50 border-red-400' 
                            : 'bg-blue-50 border-blue-400'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              {overdueCount > 0 ? (
                                <p className="text-red-800 font-semibold">
                                  ⚠️ {overdueCount} of {totalSent} sent invoices are overdue
                                </p>
                              ) : (
                                <p className="text-blue-800 font-semibold">
                                  ✅ All {totalSent} sent invoices are current
                                </p>
                              )}
                            </div>
                            {overdueCount > 0 && (
                              <div className="text-red-700 text-sm">
                                Overdue invoices are sorted to the top
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              
              {/* Paid Invoice Filters - Only show for paid tab */}
              {activeTab === 'paid' && (
                <div className="mb-6">
                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowPaidFilters(!showPaidFilters)}
                    className="btn btn-outline mb-4 min-h-[44px] py-3 px-4 font-medium"
                  >
                    {showPaidFilters ? '🔼' : '🔽'} Filter Paid Invoices
                    {hasActiveFilters && <span className="ml-2 text-green-600">({displayInvoices.length} of {totalPaidInvoices})</span>}
                  </button>
                  
                  {/* Collapsible Filter Section */}
                  {showPaidFilters && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Client Name Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client Name
                          </label>
                          <input
                            type="text"
                            placeholder="Filter by client..."
                            value={paidInvoiceFilters.clientName}
                            onChange={(e) => setPaidInvoiceFilters(prev => ({ ...prev, clientName: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-md min-h-[48px]"
                          />
                        </div>
                        
                        {/* Date From Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Paid From Date
                          </label>
                          <input
                            type="date"
                            value={paidInvoiceFilters.dateFrom}
                            onChange={(e) => setPaidInvoiceFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-md min-h-[48px]"
                          />
                        </div>
                        
                        {/* Date To Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Paid To Date
                          </label>
                          <input
                            type="date"
                            value={paidInvoiceFilters.dateTo}
                            onChange={(e) => setPaidInvoiceFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-md min-h-[48px]"
                          />
                        </div>
                        
                        {/* Clear Filters Button */}
                        <div className="flex items-end">
                          <button
                            onClick={clearPaidFilters}
                            disabled={!hasActiveFilters}
                            className={`w-full min-h-[48px] py-3 px-4 font-medium rounded-md ${
                              hasActiveFilters 
                                ? 'btn btn-outline border-red-300 text-red-600 hover:bg-red-50' 
                                : 'btn btn-outline opacity-50 cursor-not-allowed'
                            }`}
                          >
                            🗑️ Clear Filters
                          </button>
                        </div>
                      </div>
                      
                      {/* Filter Results Summary */}
                      {hasActiveFilters && (
                        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <p className="text-sm text-blue-700">
                            Showing <strong>{displayInvoices.length}</strong> of <strong>{totalPaidInvoices}</strong> paid invoices
                            {paidInvoiceFilters.clientName && <span> matching "<strong>{paidInvoiceFilters.clientName}</strong>"</span>}
                            {(paidInvoiceFilters.dateFrom || paidInvoiceFilters.dateTo) && (
                              <span>
                                {' '}paid between{' '}
                                <strong>{paidInvoiceFilters.dateFrom || 'any date'}</strong> and{' '}
                                <strong>{paidInvoiceFilters.dateTo || 'today'}</strong>
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid gap-4">
              {displayInvoices.map((invoice) => {
                const client = getClientById(invoice.clientId);
                const services = invoice.services || [];
                const usePropertyGrouping = shouldUsePropertyGrouping(client, services);
                const isOverdue = activeTab === 'sent' && invoice.isOverdue;
                
                return (
                  <div key={`${activeTab}-${invoice.id}`} className={`card ${
                    isOverdue ? 'border-red-500 bg-red-50' : ''
                  }`}>
                    <div className="card-content">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg">Invoice #{invoice.invoice_number || invoice.id}</h3>
                            <InvoiceStatusBadge status={invoice.status} size="sm" />
                            {isOverdue && (
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold border border-red-300">
                                OVERDUE - {invoice.daysOverdue} DAYS
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-1">{invoice.clientName || invoice.client_name}</p>
                          <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
                            <span><strong>Date:</strong> {invoice.date}</span>
                            <span>
                              <strong>Due:</strong> 
                              <span className={isOverdue ? 'text-red-600 font-semibold ml-1' : 'ml-1'}>
                                {invoice.due_date || invoice.dueDate}
                              </span>
                            </span>
                            {activeTab === 'paid' && (invoice.paid_date || invoice.paidDate) && (
                              <span><strong>Paid:</strong> {invoice.paid_date || invoice.paidDate}</span>
                            )}
                            <span>
                              <strong>Total:</strong> 
                              <span className={isOverdue ? 'text-red-600 font-semibold ml-1' : 'ml-1'}>
                                ${(invoice.total || 0).toFixed(2)}
                              </span>
                              {isOverdue && (
                                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold ml-2">
                                  OVERDUE
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => navigate(`/invoicing/${invoice.id}`, { state: { invoiceData: invoice } })}
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

                      {/* Services Display */}
                      {services && services.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <h4 className="font-semibold text-md mb-3">Services:</h4>
                          
                          {usePropertyGrouping && isMultiPropertyInvoice(services) ? (
                            // Multi-property display using custom logic
                            <div className="space-y-4">
                              {Object.entries(groupServicesByProperty(services)).map(([propertyName, propertyServices]) => {
                                const propertySubtotal = propertyServices.reduce((sum, item) => {
                                  return sum + ((item.quantity || 1) * (item.rate || item.amount || 0));
                                }, 0);
                                
                                return (
                                  <div key={propertyName} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                                    <div className="mb-3 pb-2 border-b border-gray-400">
                                      <h5 className="text-md font-semibold text-gray-800">
                                        === {propertyName} ===
                                      </h5>
                                    </div>
                                    
                                    <div className="space-y-2 mb-3">
                                      {propertyServices.map((service, index) => (
                                        <div key={index} className="border border-gray-200 rounded-md p-3 bg-white">
                                          <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                              <h6 className="font-medium">{service.description}</h6>
                                              <p className="text-sm text-gray-600">
                                                Qty: {service.quantity || 1} × ${(service.rate || service.amount || 0).toFixed(2)} = ${((service.quantity || 1) * (service.rate || service.amount || 0)).toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="pt-2 border-t border-gray-300">
                                      <div className="flex justify-end">
                                        <div className="text-right">
                                          <p className="text-sm text-gray-600">Property Subtotal:</p>
                                          <p className="text-md font-semibold text-green-600">
                                            ${propertySubtotal.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Total for All Properties */}
                              {Object.keys(groupServicesByProperty(services)).length > 1 && (
                                <div className="border-2 border-green-500 rounded-lg p-3 bg-green-50">
                                  <div className="flex justify-between items-center">
                                    <h5 className="text-lg font-bold text-green-800">
                                      TOTAL FOR ALL PROPERTIES:
                                    </h5>
                                    <p className="text-xl font-bold text-green-800">
                                      ${(invoice.total || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Standard flat service list
                            <div className="space-y-2">
                              {services.map((service, index) => (
                                <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                                  <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                      <h6 className="font-medium">{service.description}</h6>
                                      <p className="text-sm text-gray-600">
                                        Qty: {service.quantity || 1} × ${(service.rate || service.amount || 0).toFixed(2)} = ${((service.quantity || 1) * (service.rate || service.amount || 0)).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {displayInvoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No {activeTab} invoices found.</p>
                </div>
              )}
              </div>
            </div>
          )}
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
                    <p><strong>Invoice:</strong> #{deleteConfirmation.invoice.invoice_number || deleteConfirmation.invoice.id}</p>
                    <p><strong>Client:</strong> {deleteConfirmation.invoice.client_name}</p>
                    <p><strong>Services:</strong> {deleteConfirmation.invoice.line_items ? deleteConfirmation.invoice.line_items.length : 0} items</p>
                    <p><strong>Total:</strong> ${(deleteConfirmation.invoice.subtotal || 0).toFixed(2)}</p>
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
                disabled={deleting[deleteConfirmation.invoice.id]}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteInvoice}
                disabled={deleting[deleteConfirmation.invoice.id]}
                className="flex-1 btn btn-danger"
              >
                {deleting[deleteConfirmation.invoice.id] ? '⏳ Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AmountInput({ value, onChange, name, placeholder, required = false }) {
  const [inputValue, setInputValue] = useState(value === 0 ? '' : value.toString());

  // Sync internal state when value prop changes
  useEffect(() => {
    setInputValue(value === 0 ? '' : value.toString());
  }, [value]);

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
    notes: '',
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
  const tax = 0; // No tax applied
  const total = subtotal;

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
      
      alert(`✅ Success!\n\nInvoice #${newInvoice.invoice_number || newInvoice.id} created successfully!\n\nThe invoice is now in your Collecting tab and ready for editing.`);
      
      // Navigate to invoicing with collecting tab active to show the new invoice
      // Use replace to ensure the invoice list refreshes on navigation
      navigate('/invoicing', { replace: true, state: { refreshInvoices: true } });
    } catch (error) {
      console.error('Failed to create invoice:', error);
      
      // Handle duplicate collecting invoice error specifically
      if (error.message && error.message.includes('they already have a collecting invoice')) {
        alert(`⚠️ Cannot Create Invoice\n\n${error.message}`);
      } else {
        alert('❌ Failed to create invoice. Please try again.');
      }
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
                          className="btn btn-danger btn-sm w-full"
                          title="Remove this service from the invoice"
                        >
                          Delete Service
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
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">📝 Invoice Notes</label>
              <textarea
                name="notes"
                value={invoiceData.notes}
                onChange={handleInputChange}
                placeholder="Optional: Enter specific details about this service..."
                className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px]"
                rows={4}
              />
              <div className="mt-2 text-sm text-gray-500">
                Notes will be included in sent invoices and displayed to clients.
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
    getAllDatabaseInvoices
  } = useData();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(location.state?.invoiceData || null);
  const [loading, setLoading] = useState(!location.state?.invoiceData);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    // Use passed invoice data or fetch from database
    if (location.state?.invoiceData) {
      // Use the updated invoice data passed from edit
      setInvoice(location.state.invoiceData);
      setLoading(false);
    } else {
      // Fetch from database if no data was passed
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
    }
  }, [id, getAllDatabaseInvoices, location.state?.invoiceData]);

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
    try {
      const client = getClientById(invoice.clientId);
      if (client && client.email) {
        const { sendInvoiceEmail } = await import('../services/emailService');
        const currentBusinessInfo = {
          name: "Trusting and Affordable Tree Service and Lawn Care",
          phone: "(516) 580-1223",
          email: "Trustingandaffordabletrees@gmail.com",
          paymentMethods: ["Zelle", "Venmo", "Cash App", "Check"]
        };
        
        await sendInvoiceEmail(invoice, client, currentBusinessInfo);
        alert('Invoice sent successfully via email!');
        
        // Clear the modifiedSinceSent flag in database without changing status
        const { updateInvoiceModifiedFlag } = await import('../utils/databaseHelpers');
        await updateInvoiceModifiedFlag(invoice.id, false);
        
        // Refresh invoice data to update UI
        const databaseInvoices = await getAllDatabaseInvoices();
        const updatedInvoice = databaseInvoices.find(inv => inv.id === parseInt(invoice.id));
        if (updatedInvoice) {
          setInvoice(updatedInvoice);
        }
      } else {
        alert('No email address found for this client.');
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
    }
  };

  const handleMarkPaid = async () => {
    const paymentMethod = paymentMethods[0] || 'Cash';
    const confirmed = window.confirm(
      `Mark Invoice #${invoice.invoice_number || invoice.id} as paid? Payment method: ${paymentMethod}`
    );
    
    if (!confirmed) return;

    try {
      setMarkingPaid(true);
      
      // Use the enhanced helper that sends receipt emails
      const { markInvoicePaidWithReceipt } = await import('../utils/invoiceHelpers');
      await markInvoicePaidWithReceipt(invoice.id, paymentMethod);
      
      // Optimistically update the invoice state
      setInvoice(prev => ({
        ...prev,
        status: 'Paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod
      }));
      
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      alert('Failed to mark invoice as paid. Please try again.');
    } finally {
      setMarkingPaid(false);
    }
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
              {/* Edit Invoice button - available for non-paid invoices */}
              {(invoice.status !== 'Paid' && invoice.status !== 'paid') && (
                <button
                  onClick={() => navigate(`/invoicing/${invoice.id}/edit`, { state: { invoiceData: invoice } })}
                  className="btn btn-primary"
                >
                  Edit Invoice
                </button>
              )}
              
              {/* Send Invoice button - only for collecting status */}
              {(invoice.status === 'Collecting' || invoice.status === 'collecting') && (
                <button onClick={handleSendInvoice} className="btn btn-secondary">
                  📧 Send Invoice
                </button>
              )}
              
              {/* Send Updated Invoice button - for modified sent invoices */}
              {(invoice.status === 'Sent' || invoice.status === 'sent') && invoice.modifiedSinceSent && (
                <button onClick={handleSendInvoice} className="btn btn-secondary">
                  📧 Send Updated Invoice
                </button>
              )}
              
              {/* Mark Paid button - for sent/pending invoices (handle both case variations) */}
              {(invoice.status === 'Pending' || invoice.status === 'pending' || 
                invoice.status === 'Sent' || invoice.status === 'sent') && (
                <button 
                  onClick={handleMarkPaid} 
                  disabled={markingPaid}
                  className="btn btn-success"
                >
                  {markingPaid ? '⏳ Processing...' : '✓ Mark Paid'}
                </button>
              )}
              
              {/* Download PDF button - for sent and paid invoices only (not collecting) */}
              {((invoice.status === 'Sent' || invoice.status === 'sent' || 
                invoice.status === 'Paid' || invoice.status === 'paid')) && (
                <button
                  onClick={() => window.open(`/invoice/${invoice.invoice_number || invoice.id}/view`, '_blank')}
                  className="btn btn-outline"
                >
                  📄 Download PDF
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

          {/* Notes Section */}
          {invoice.notes && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">📝 Notes:</h3>
              <div className="bg-gray-50 p-4 rounded-md border-l-4 border-blue-400">
                <div className="whitespace-pre-wrap text-gray-700">
                  {invoice.notes}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
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
    getClientById,
    updateInvoice,
    updateDatabaseInvoice,
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
    notes: '',
    services: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
  });

  useEffect(() => {
    if (invoice) {
      // Comprehensive debug logging
      console.log('=== INVOICE SERVICES DEBUG ===');
      console.log('Full invoice object:', invoice);
      console.log('Invoice services array:', invoice.services);
      console.log('Invoice line_items array:', invoice.line_items);
      
      // Check if services come from line_items (database invoices)
      const servicesData = invoice.services || invoice.line_items;
      
      if (servicesData) {
        console.log('Services data source:', invoice.services ? 'services' : 'line_items');
        console.log('Raw services data:', servicesData);
        
        servicesData.forEach((service, index) => {
          console.log(`Service ${index + 1} RAW:`, service);
          console.log(`Service ${index + 1} DETAILS:`, {
            description: service.description,
            rate: service.rate,
            rateType: typeof service.rate,
            rateValue: JSON.stringify(service.rate),
            rateIsNull: service.rate === null,
            rateIsUndefined: service.rate === undefined,
            quantity: service.quantity,
            quantityType: typeof service.quantity,
            amount: service.amount,
            amountType: typeof service.amount
          });
        });
      }
      
      setSelectedClient(getClientById(invoice.clientId));
      
      // Fix services initialization with proper type conversion
      // Handle both 'services' and 'line_items' properties (database invoices use line_items)
      const services = servicesData ? servicesData.map(service => {
        // More robust conversion handling null, undefined, and string values
        const qty = service.quantity !== null && service.quantity !== undefined 
          ? Number(service.quantity) 
          : 1;
        const rt = service.rate !== null && service.rate !== undefined 
          ? Number(service.rate) 
          : 0;
        const amt = service.amount !== null && service.amount !== undefined 
          ? Number(service.amount) 
          : (qty * rt);
        
        const converted = {
          description: service.description || '',
          quantity: qty,
          rate: rt,
          amount: amt
        };
        
        console.log(`Converting service "${service.description}":`, {
          original: { rate: service.rate, quantity: service.quantity, amount: service.amount },
          converted: converted
        });
        
        return converted;
      }) : [{ description: '', quantity: 1, rate: 0, amount: 0 }];
      
      console.log('Final converted services for form:', services);
      
      setInvoiceData({
        date: invoice.date || '',
        dueDate: invoice.dueDate || '',
        notes: invoice.notes || '',
        services: services
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
    
    // Ensure proper numeric handling for quantity and rate
    if (field === 'quantity') {
      newServices[index][field] = Number(value) || 1;
    } else if (field === 'rate') {
      newServices[index][field] = Number(value) || 0;
    } else {
      newServices[index][field] = value;
    }
    
    // Auto-calculate amount with proper number conversion
    if (field === 'quantity' || field === 'rate') {
      const qty = Number(newServices[index].quantity) || 1;
      const rt = Number(newServices[index].rate) || 0;
      newServices[index].amount = qty * rt;
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
  const tax = 0; // No tax applied
  const total = subtotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    
    try {
      // Use database update for sent/paid invoices (they're in the database)
      // Check invoice status to determine if it's a database invoice
      const isCollecting = invoice.status === 'collecting' || invoice.status === 'Collecting';
      
      if (isCollecting) {
        // Collecting invoices still use localStorage
        updateInvoice(invoice.id, {
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          ...invoiceData,
          subtotal,
          tax,
          total
        });
        alert('Invoice updated successfully!');
        
        // Navigate with updated collecting invoice data
        navigate(`/invoicing/${invoice.id}`, { 
          state: { 
            invoiceData: {
              ...invoice,
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              ...invoiceData,
              subtotal,
              tax,
              total
            }
          }
        });
        return;
      } else {
        // Sent/Paid invoices use database update
        const updatedInvoice = await updateDatabaseInvoice(invoice.id, {
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          ...invoiceData,
          subtotal,
          tax,
          total
        });
        
        // Show success message
        alert('Invoice updated successfully!');
        
        // Refresh invoice data to get updated totals from database
        const databaseInvoices = await getAllDatabaseInvoices();
        const refreshedInvoice = databaseInvoices.find(inv => inv.id === parseInt(invoice.id));
        
        // Navigate with refreshed invoice data
        navigate(`/invoicing/${invoice.id}`, { 
          state: { invoiceData: refreshedInvoice || updatedInvoice },
          replace: true 
        });
        return;
      }
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert('Failed to update invoice. Please try again.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/invoicing/${invoice.id}`, { state: { invoiceData: invoice } })} className="btn btn-outline">
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
                      <input
                        type="number"
                        required
                        value={service.quantity}
                        onChange={(e) => handleServiceChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        placeholder="1"
                        min="1"
                        step="1"
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
                          className="btn btn-danger btn-sm w-full"
                          title="Remove this service from the invoice"
                        >
                          Delete Service
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
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">📝 Invoice Notes</label>
              <textarea
                name="notes"
                value={invoiceData.notes}
                onChange={handleInputChange}
                placeholder="Optional: Enter specific details about this service..."
                className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px]"
                rows={4}
              />
              <div className="mt-2 text-sm text-gray-500">
                Notes will be included in sent invoices and displayed to clients.
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary">
                Update Invoice
              </button>
              <button
                type="button"
                onClick={() => navigate(`/invoicing/${invoice.id}`, { state: { invoiceData: invoice } })}
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