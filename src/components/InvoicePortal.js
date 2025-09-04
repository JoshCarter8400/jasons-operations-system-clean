import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

// InvoicePortal - Public-facing invoice display for clients
function InvoicePortal() {
  const { invoiceId } = useParams();
  const { getAllDatabaseInvoices, getClientById } = useData();
  
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle PDF download/print
  const handlePrintPDF = () => {
    window.print();
  };

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all database invoices
        const databaseInvoices = await getAllDatabaseInvoices();
        
        // Find invoice by invoice_number (invoiceId parameter)
        const foundInvoice = databaseInvoices.find(inv => 
          inv.invoice_number === invoiceId
        );
        
        if (!foundInvoice) {
          setError('Invoice not found');
          return;
        }
        
        setInvoice(foundInvoice);
        
        // Fetch client data
        const clientData = getClientById(foundInvoice.clientId || foundInvoice.client_id);
        setClient(clientData);
        
      } catch (error) {
        console.error('Failed to load invoice:', error);
        setError('Failed to load invoice data');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId, getAllDatabaseInvoices, getClientById]);

  // Set document title for proper PDF filename
  useEffect(() => {
    // Store original title to restore later
    const originalTitle = document.title;

    if (invoice?.invoice_number) {
      // Set meaningful title for PDF filename
      document.title = `Invoice ${invoice.invoice_number} - Trusting and Affordable Tree Service`;
    }

    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="card">
            <div className="card-content">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4 mx-auto"></div>
                <p className="text-gray-600">Loading invoice...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="card">
            <div className="card-content">
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-red-600 mb-4">
                  {error || 'Invoice Not Found'}
                </h1>
                <p className="text-gray-600 mb-4">
                  Unable to find invoice: {invoiceId}
                </p>
                <p className="text-sm text-gray-500">
                  Please check the invoice number and try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if invoice is paid
  const isPaid = invoice.status === 'Paid' || invoice.status === 'paid';
  const paymentDate = invoice.paid_date || invoice.paidDate;

  return (
    <>
      {/* Print-specific CSS */}
      <style>
        {`
          @media print {
            /* Hide download button and other UI elements when printing */
            .no-print {
              display: none !important;
            }
            
            /* Optimize page for printing */
            body {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            /* Remove page margins and background */
            .print-container {
              margin: 0 !important;
              padding: 20px !important;
              background: white !important;
              min-height: unset !important;
            }
            
            .print-card {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              background: white !important;
            }
            
            /* Optimize table for printing */
            table {
              border-collapse: collapse !important;
            }
            
            th, td {
              border: 1px solid #000 !important;
              padding: 8px !important;
            }
            
            /* Ensure proper page breaks */
            .page-break-avoid {
              page-break-inside: avoid;
            }
            
            /* Make text darker for better printing */
            .text-gray-600 {
              color: #000 !important;
            }
            
            .text-gray-700 {
              color: #000 !important;
            }
            
            /* Optimize colors for black and white printing */
            .bg-green-100 {
              background-color: #f0f0f0 !important;
              border: 1px solid #000 !important;
            }
            
            .bg-blue-100 {
              background-color: #f0f0f0 !important;
              border: 1px solid #000 !important;
            }
            
            .bg-yellow-100 {
              background-color: #f0f0f0 !important;
              border: 1px solid #000 !important;
            }
            
            .text-green-600, .text-blue-800, .text-yellow-800, .text-green-700 {
              color: #000 !important;
            }
            
            /* PAID banner styling for print */
            .border-green-500 {
              border: 2px solid #000 !important;
            }
            
            .bg-gray-50 {
              background-color: #f9f9f9 !important;
            }
          }
        `}
      </style>
      
      <div className="min-h-screen bg-gray-50 print-container">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="card print-card">
            <div className="card-header">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  Trusting and Affordable Tree Service
                </h1>
                <p className="text-lg text-gray-600">Invoice #{invoice.invoice_number}</p>
              </div>
              
              {/* PAID Banner for paid invoices */}
              {isPaid && (
                <div className="text-center mt-6 mb-4">
                  <div className="inline-block bg-green-100 border-2 border-green-500 rounded-lg px-8 py-4">
                    <div className="text-3xl font-bold text-green-700 mb-1">PAID</div>
                    {paymentDate && (
                      <div className="text-sm text-green-600 font-medium">
                        Payment Received: {paymentDate}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Download PDF Button - Hidden when printing */}
              <div className="text-center mt-6 no-print">
                <button
                  onClick={handlePrintPDF}
                  className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
            
            <div className="card-content">
              {/* Invoice Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 page-break-avoid">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Bill To:</h3>
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{invoice.clientName || client?.name}</p>
                    {client?.address && (
                      <p className="text-gray-600">{client.address}</p>
                    )}
                    {client?.phone && (
                      <p className="text-gray-600">{client.phone}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-4">Invoice Details:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-medium">{invoice.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{invoice.due_date || invoice.dueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    {isPaid && paymentDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Date:</span>
                        <span className="font-medium text-green-600">{paymentDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="mb-8 page-break-avoid">
                <h3 className="font-semibold text-lg mb-4">Services:</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Description</th>
                        <th className="text-center p-4 font-medium text-gray-900">Qty</th>
                        <th className="text-right p-4 font-medium text-gray-900">Rate</th>
                        <th className="text-right p-4 font-medium text-gray-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.services || invoice.line_items || []).map((service, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="p-4">{service.description}</td>
                          <td className="p-4 text-center">{service.quantity}</td>
                          <td className="p-4 text-right">${(service.rate || 0).toFixed(2)}</td>
                          <td className="p-4 text-right font-medium">${(service.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes Section */}
              {invoice.notes && (
                <div className="mb-8">
                  <h3 className="font-semibold text-lg mb-4">Notes:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-400">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {invoice.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Totals */}
              <div className="flex justify-end page-break-avoid">
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span>${(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${(invoice.tax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xl border-t pt-3">
                    <span>Total:</span>
                    <span className="text-green-600">${(invoice.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600">
                <p className="mb-2">
                  <strong>Trusting and Affordable Tree Service and Lawn Care</strong>
                </p>
                <p className="text-sm">
                  Phone: (516) 580-1223 | Email: Trustingandaffordabletrees@gmail.com
                </p>
                <p className="text-xs mt-4 text-gray-500">
                  Thank you for your business!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InvoicePortal;