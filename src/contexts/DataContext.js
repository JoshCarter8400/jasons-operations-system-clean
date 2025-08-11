import React, { createContext, useContext, useState, useEffect } from 'react';
import { jasonBusinessData, invoices as initialInvoices } from '../data/jasonData';
import { sendInvoiceEmail, sendPaymentReceiptEmail, createEmailNotification } from '../services/emailService';
import {
  getClients,
  createClient as dbCreateClient,
  updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient,
  migrateFromLocalStorage
} from '../utils/database';
import { insertInvoiceWithNumber, insertInvoiceLineItem, getInvoiceWithLineItems, updateInvoiceTotals, deleteInvoiceLineItems } from '../utils/databaseHelpers';
import { 
  createCollectingInvoice, 
  addServiceToInvoice, 
  sendCollectingInvoice, 
  markInvoicePaid as dbMarkInvoicePaid, 
  getCollectingInvoiceForClient 
} from '../utils/invoiceHelpers';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [businessData, setBusinessData] = useState(() => {
    // Keep localStorage for non-client data (business info, services, payment methods, invoices)
    // Only clients will be moved to database
    const stored = localStorage.getItem('jasonBusinessData');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, clients: [] }; // Empty clients array - will be loaded from database
    }
    return { ...jasonBusinessData, clients: [], invoices: initialInvoices };
  });

  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  
  // Collecting invoices state - cache for performance
  const [collectingInvoices, setCollectingInvoices] = useState({});
  const [collectingInvoicesLoading, setCollectingInvoicesLoading] = useState({});

  // Load clients from database on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const dbClients = await getClients();
        setClients(dbClients);
        setClientsLoaded(true);
        setClientsLoading(false);
      } catch (error) {
        console.error('Failed to load clients from database:', error);
        // Try to migrate from localStorage if database fails
        const stored = localStorage.getItem('jasonBusinessData');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.clients && parsed.clients.length > 0) {
            try {
              console.log('Attempting to migrate clients to database...');
              await migrateFromLocalStorage(parsed);
              const dbClients = await getClients();
              setClients(dbClients);
              setClientsLoaded(true);
        setClientsLoading(false);
              console.log('Client migration successful');
            } catch (migrationError) {
              console.error('Migration failed, using localStorage data:', migrationError);
              setClients(parsed.clients || []);
              setClientsLoaded(true);
        setClientsLoading(false);
            }
          } else {
            setClients([]);
            setClientsLoaded(true);
        setClientsLoading(false);
          }
        }
      }
    };
    
    loadClients();
  }, []);

  // Save non-client data to localStorage
  useEffect(() => {
    const dataToStore = {
      ...businessData,
      clients: [] // Don't store clients in localStorage anymore
    };
    localStorage.setItem('jasonBusinessData', JSON.stringify(dataToStore));
  }, [businessData]);

  const updateBusinessInfo = (updates) => {
    setBusinessData(prev => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, ...updates }
    }));
  };

  const addServiceArea = (areaName) => {
    if (areaName && !businessData.businessInfo.serviceAreas.includes(areaName)) {
      setBusinessData(prev => ({
        ...prev,
        businessInfo: {
          ...prev.businessInfo,
          serviceAreas: [...prev.businessInfo.serviceAreas, areaName]
        }
      }));
      return true;
    }
    return false;
  };

  const removeServiceArea = (areaName) => {
    setBusinessData(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        serviceAreas: prev.businessInfo.serviceAreas.filter(area => area !== areaName)
      }
    }));
    return true;
  };

  const addService = (serviceData) => {
    const { name, priceRange, defaultRate } = serviceData;
    if (name && !businessData.services.find(s => s.name === name)) {
      const newService = {
        name,
        priceRange: priceRange || '$0-$100',
        defaultRate: defaultRate || 0
      };
      setBusinessData(prev => ({
        ...prev,
        services: [...prev.services, newService]
      }));
      return true;
    }
    return false;
  };

  const removeService = (serviceName) => {
    setBusinessData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.name !== serviceName)
    }));
    return true;
  };

  const updateService = (serviceName, serviceData) => {
    setBusinessData(prev => ({
      ...prev,
      services: prev.services.map(s => 
        s.name === serviceName ? { ...s, ...serviceData } : s
      )
    }));
    return true;
  };

  const addPaymentMethod = (method) => {
    if (method && !businessData.paymentMethods.includes(method)) {
      setBusinessData(prev => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, method]
      }));
      return true;
    }
    return false;
  };

  const removePaymentMethod = (method) => {
    setBusinessData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter(m => m !== method)
    }));
    return true;
  };

  const addClient = async (clientData) => {
    try {
      const newClient = await dbCreateClient({
        ...clientData,
        createdDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      });
      // Update local state
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      console.error('Failed to create client:', error);
      throw error;
    }
  };

  const updateClient = async (id, clientData) => {
    try {
      const updatedClient = await dbUpdateClient(parseInt(id), clientData);
      // Update local state
      setClients(prev => prev.map(client => 
        client.id === parseInt(id) ? updatedClient : client
      ));
      return true;
    } catch (error) {
      console.error('Failed to update client:', error);
      throw error;
    }
  };

  const addInvoice = async (invoiceData) => {
    try {
      // Create invoice with proper numbering in database
      const dbInvoice = await insertInvoiceWithNumber({
        client_id: invoiceData.clientId,
        client_name: invoiceData.clientName,
        date: invoiceData.date,
        due_date: invoiceData.dueDate,
        status: 'collecting', // Manual invoices start as collecting for editing
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        total: invoiceData.total,
        notes: invoiceData.notes || '',
        sent_date: new Date().toISOString().split('T')[0],
        paid_date: null
      });

      // Add line items to the database invoice
      if (invoiceData.services && invoiceData.services.length > 0) {
        for (const service of invoiceData.services) {
          await insertInvoiceLineItem(dbInvoice.id, {
            description: service.description,
            quantity: service.quantity,
            rate: service.rate,
            amount: service.amount
          });
        }
      }

      console.log('✅ Created invoice in database:', dbInvoice.invoice_number);
      return dbInvoice;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  };

  const updateInvoice = (id, invoiceData) => {
    setBusinessData(prev => ({
      ...prev,
      invoices: (prev.invoices || []).map(invoice => 
        invoice.id === parseInt(id) ? { ...invoice, ...invoiceData } : invoice
      )
    }));
    return true;
  };

  const markInvoicePaid = async (id, paymentMethod = '') => {
    const invoice = (businessData.invoices || []).find(inv => inv.id === parseInt(id));
    if (invoice) {
      updateInvoice(id, {
        status: 'Paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || invoice.paymentMethod
      });
      
      const client = businessData.clients.find(c => c.id === invoice.clientId);
      if (client) {
        updateClient(client.id, {
          totalPaid: client.totalPaid + invoice.total
        });
        
        // Send payment receipt email
        if (client.email) {
          const emailResult = await sendPaymentReceiptEmail(
            { ...invoice, status: 'Paid', paidDate: new Date().toISOString().split('T')[0] },
            client,
            businessData.businessInfo,
            paymentMethod || invoice.paymentMethod
          );
          
          if (emailResult.success) {
            createEmailNotification(
              'receipt',
              'Payment Receipt Sent!',
              `Receipt for Invoice #${invoice.invoice_number || invoice.id} sent to ${client.email}`,
              true
            );
          } else {
            createEmailNotification(
              'receipt_error',
              'Receipt Email Failed',
              `Could not send receipt to ${client.email}. Please check email address.`,
              false
            );
          }
        }
      }
      
      return true;
    }
    return false;
  };

  const sendInvoice = async (id, method = 'email') => {
    const invoice = (businessData.invoices || []).find(inv => inv.id === parseInt(id));
    if (invoice) {
      updateInvoice(id, {
        status: 'Sent',
        sentDate: new Date().toISOString().split('T')[0]
      });

      if (method === 'email') {
        const client = businessData.clients.find(c => c.id === invoice.clientId);
        if (client && client.email) {
          const emailResult = await sendInvoiceEmail(
            { ...invoice, status: 'Sent', sentDate: new Date().toISOString().split('T')[0] },
            client,
            businessData.businessInfo
          );
          
          if (emailResult.success) {
            createEmailNotification(
              'invoice_sent',
              'Invoice Sent Successfully!',
              `Invoice #${invoice.invoice_number || invoice.id} sent to ${client.email}`,
              true
            );
            return { success: true, method: 'email', recipient: client.email };
          } else {
            createEmailNotification(
              'invoice_error',
              'Invoice Email Failed',
              `Could not send invoice to ${client.email}. Please check email address.`,
              false
            );
            return { success: false, error: emailResult.error };
          }
        } else {
          createEmailNotification(
            'invoice_warning',
            'No Email Address',
            `Invoice #${invoice.invoice_number || invoice.id} marked as sent - no email address on file for ${businessData.clients.find(c => c.id === invoice.clientId)?.name}`,
            false
          );
          return { success: true, method: 'marked', note: 'No email address available' };
        }
      }
      
      return { success: true, method: method };
    }
    return { success: false };
  };

  const getClientById = (id) => {
    return clients.find(client => client.id === parseInt(id));
  };

  const getInvoiceById = (id) => {
    return (businessData.invoices || []).find(invoice => invoice.id === parseInt(id));
  };

  const scheduleService = (clientId, date, time, notes, duration, serviceType, area) => {
    const client = businessData.clients.find(c => c.id === parseInt(clientId));
    if (client) {
      const scheduleData = {
        date,
        time,
        notes,
        duration,
        serviceType: serviceType || client.serviceType,
        area: area || client.area,
        scheduledAt: new Date().toISOString()
      };
      
      updateClient(clientId, {
        nextService: date,
        lastScheduled: scheduleData
      });
      
      return true;
    }
    return false;
  };

  const searchClients = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return clients;
    
    const term = searchTerm.toLowerCase().trim();
    return clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.address.toLowerCase().includes(term) ||
      client.phone.toLowerCase().replace(/[\s\-()]/g, '').includes(term.replace(/[\s\-()]/g, '')) ||
      client.area.toLowerCase().includes(term) ||
      client.serviceType.toLowerCase().includes(term)
    );
  };

  const getClientsWithNoInvoices = () => {
    const clientsWithInvoices = new Set((businessData.invoices || []).map(inv => inv.clientId));
    return clients.filter(client => !clientsWithInvoices.has(client.id));
  };

  const generateOptimizedRoute = (addresses) => {
    return addresses.map((address, index) => ({
      id: index + 1,
      address,
      order: index + 1,
      estimatedTime: '30 mins',
      estimatedDriveTime: index === 0 ? '0 mins' : '8 mins'
    }));
  };

  const refreshClients = async () => {
    try {
      setClientsLoading(true);
      const dbClients = await getClients();
      setClients(dbClients);
      setClientsLoading(false);
    } catch (error) {
      console.error('Failed to refresh clients:', error);
      setClientsLoading(false);
      throw error;
    }
  };

  // ============================================================================
  // COLLECTING INVOICE FUNCTIONS - Jason's Core Workflow
  // ============================================================================

  /**
   * Gets or creates a collecting invoice for a client
   * This is the core of Jason's workflow - services accumulate here
   */
  const getCurrentCollectingInvoice = async (clientId) => {
    try {
      setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: true }));
      
      // Check cache first
      if (collectingInvoices[clientId]) {
        setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: false }));
        return collectingInvoices[clientId];
      }

      // Try to get existing collecting invoice
      let invoice = await getCollectingInvoiceForClient(clientId);
      
      if (!invoice) {
        // Create new collecting invoice
        const client = clients.find(c => c.id === clientId);
        if (!client) {
          throw new Error('Client not found');
        }
        
        invoice = await createCollectingInvoice(clientId, client);
      } else {
        // Get full invoice with line items
        invoice = await getInvoiceWithLineItems(invoice.id);
      }

      // Cache the invoice
      setCollectingInvoices(prev => ({ ...prev, [clientId]: invoice }));
      setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: false }));
      
      return invoice;
    } catch (error) {
      console.error('Failed to get collecting invoice:', error);
      setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: false }));
      throw error;
    }
  };

  /**
   * Adds a completed service to a client's collecting invoice
   * This is called when Jason marks a service as complete
   */
  const addServiceToCollectingInvoice = async (clientId, serviceData) => {
    try {
      const invoice = await getCurrentCollectingInvoice(clientId);
      
      // Calculate service amount WITHOUT tax (tax calculated at invoice level)
      const serviceAmount = serviceData.quantity * serviceData.rate;
      
      // Add service to the invoice
      await addServiceToInvoice(invoice.id, {
        description: serviceData.description,
        quantity: serviceData.quantity,
        rate: serviceData.rate,
        amount: serviceAmount // Store amount without tax
      });

      // Get updated invoice and refresh cache
      const updatedInvoice = await getInvoiceWithLineItems(invoice.id);
      setCollectingInvoices(prev => ({ ...prev, [clientId]: updatedInvoice }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Failed to add service to collecting invoice:', error);
      throw error;
    }
  };

  /**
   * Updates an existing service in a collecting invoice
   * Allows Jason to edit services while in collecting mode
   */
  const updateServiceInCollectingInvoice = async (invoiceId, lineItemId, updatedData) => {
    try {
      // Get the current invoice
      const invoice = await getInvoiceWithLineItems(invoiceId);
      if (!invoice || invoice.status !== 'collecting') {
        throw new Error('Can only edit collecting invoices');
      }

      // Delete old line item and create new one (simpler than complex update)
      await deleteInvoiceLineItems([lineItemId]);
      
      // Calculate service amount WITHOUT tax (tax calculated at invoice level)
      const serviceAmount = updatedData.quantity * updatedData.rate;
      
      await insertInvoiceLineItem(invoiceId, {
        description: updatedData.description,
        quantity: updatedData.quantity,
        rate: updatedData.rate,
        amount: serviceAmount
      });

      // Update invoice totals
      await updateInvoiceTotals(invoiceId, 0.075); // 7.5% tax rate

      // Refresh cache
      const updatedInvoice = await getInvoiceWithLineItems(invoiceId);
      const clientId = updatedInvoice.client_id;
      setCollectingInvoices(prev => ({ ...prev, [clientId]: updatedInvoice }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Failed to update service in collecting invoice:', error);
      throw error;
    }
  };

  /**
   * Removes a service from a collecting invoice
   */
  const removeServiceFromCollectingInvoice = async (invoiceId, lineItemId) => {
    try {
      const invoice = await getInvoiceWithLineItems(invoiceId);
      if (!invoice || invoice.status !== 'collecting') {
        throw new Error('Can only edit collecting invoices');
      }

      await deleteInvoiceLineItems([lineItemId]);
      await updateInvoiceTotals(invoiceId, 0.075); // 7.5% tax rate

      // Refresh cache
      const updatedInvoice = await getInvoiceWithLineItems(invoiceId);
      const clientId = updatedInvoice.client_id;
      setCollectingInvoices(prev => ({ ...prev, [clientId]: updatedInvoice }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Failed to remove service from collecting invoice:', error);
      throw error;
    }
  };

  /**
   * Sends a collecting invoice (collecting -> sent)
   * Creates a new collecting invoice for the client automatically
   */
  const sendCollectingInvoiceToClient = async (invoiceId) => {
    try {
      const invoice = await getInvoiceWithLineItems(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const client = clients.find(c => c.id === invoice.client_id);
      if (!client) {
        throw new Error('Client not found');
      }

      // Send the collecting invoice
      const result = await sendCollectingInvoice(invoiceId, client);
      
      // Update cache - remove old collecting invoice and add new one
      setCollectingInvoices(prev => ({ 
        ...prev, 
        [invoice.client_id]: result.newCollectingInvoice 
      }));

      // Send email if configured
      if (client.email) {
        const emailResult = await sendInvoiceEmail(
          result.sentInvoice,
          client,
          businessData.businessInfo
        );
        
        if (emailResult.success) {
          createEmailNotification(
            'invoice_sent',
            'Invoice Sent Successfully!',
            `Invoice #${result.sentInvoice.invoice_number} sent to ${client.email}`,
            true
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to send collecting invoice:', error);
      throw error;
    }
  };

  /**
   * Marks an invoice as paid
   * Uses the database helper for proper workflow
   */
  const markCollectingInvoicePaid = async (invoiceId, paymentMethod) => {
    try {
      const result = await dbMarkInvoicePaid(invoiceId, paymentMethod, 'email');
      
      // If this was a collecting invoice, remove from cache
      const clientId = result.client_id;
      if (collectingInvoices[clientId] && collectingInvoices[clientId].id === invoiceId) {
        setCollectingInvoices(prev => {
          const newState = { ...prev };
          delete newState[clientId];
          return newState;
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      throw error;
    }
  };

  /**
   * Gets all collecting invoices for display
   */
  const getAllCollectingInvoices = async () => {
    try {
      const promises = clients.map(client => getCurrentCollectingInvoice(client.id));
      const invoices = await Promise.all(promises);
      return invoices.filter(invoice => invoice && invoice.line_items && invoice.line_items.length > 0);
    } catch (error) {
      console.error('Failed to get all collecting invoices:', error);
      return [];
    }
  };

  /**
   * Gets all database invoices (sent, paid, etc.) from the database
   */
  const getAllDatabaseInvoices = async () => {
    try {
      const { execute } = await import('../utils/database');
      
      const result = await execute(`
        SELECT i.*, 
               COUNT(li.id) as line_item_count
        FROM invoices i
        LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
        WHERE i.status != 'collecting'
        GROUP BY i.id
        ORDER BY i.date DESC, i.id DESC
      `);

      // Convert database format to UI format
      const invoices = await Promise.all(
        result.rows.map(async (invoice) => {
          // Get line items
          const lineItemsResult = await execute(
            'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY created_at',
            [invoice.id]
          );

          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            clientId: invoice.client_id,
            clientName: invoice.client_name,
            date: invoice.date,
            dueDate: invoice.due_date,
            status: invoice.status === 'sent' ? 'Sent' : invoice.status === 'paid' ? 'Paid' : invoice.status,
            services: lineItemsResult.rows,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            notes: invoice.notes,
            sentDate: invoice.sent_date,
            paidDate: invoice.paid_date,
            paymentMethod: invoice.payment_method
          };
        })
      );

      console.log(`📊 Retrieved ${invoices.length} database invoices`);
      return invoices;
    } catch (error) {
      console.error('Failed to get database invoices:', error);
      return [];
    }
  };

  /**
   * Mark a scheduled service as complete and add to collecting invoice
   * This is Jason's main workflow action
   */
  const markServiceComplete = async (clientId, serviceDetails) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Default service data based on client profile
      const serviceData = {
        description: serviceDetails.description || client.serviceType || 'Service',
        quantity: serviceDetails.quantity || 1,
        rate: serviceDetails.rate || parseFloat(client.price?.replace(/[^0-9.]/g, '') || '0'),
        completedDate: new Date().toISOString().split('T')[0]
      };

      // Add to collecting invoice
      const updatedInvoice = await addServiceToCollectingInvoice(clientId, serviceData);

      // Show success notification
      createEmailNotification(
        'service_complete',
        'Service Added to Invoice!',
        `${serviceData.description} added to ${client.name}'s collecting invoice`,
        true
      );

      return updatedInvoice;
    } catch (error) {
      console.error('Failed to mark service complete:', error);
      throw error;
    }
  };

  const value = {
    businessData,
    businessInfo: businessData.businessInfo,
    services: businessData.services,
    serviceAreas: businessData.businessInfo.serviceAreas,
    paymentMethods: businessData.paymentMethods,
    clients: clients,
    clientsLoading,
    clientsLoaded,
    refreshClients,
    deleteClient: async (id) => {
      try {
        await dbDeleteClient(parseInt(id));
        // Update local state
        setClients(prev => prev.filter(client => client.id !== parseInt(id)));
        return true;
      } catch (error) {
        console.error('Failed to delete client:', error);
        throw error;
      }
    },
    invoices: businessData.invoices || [],
    
    updateBusinessInfo,
    addServiceArea,
    removeServiceArea,
    addService,
    removeService,
    updateService,
    addPaymentMethod,
    removePaymentMethod,
    addClient,
    updateClient,
    addInvoice,
    updateInvoice,
    markInvoicePaid,
    sendInvoice,
    getClientById,
    getInvoiceById,
    scheduleService,
    searchClients,
    getClientsWithNoInvoices,
    generateOptimizedRoute,
    
    // Collecting Invoice Functions
    getCurrentCollectingInvoice,
    addServiceToCollectingInvoice,
    updateServiceInCollectingInvoice,
    removeServiceFromCollectingInvoice,
    sendCollectingInvoiceToClient,
    markCollectingInvoicePaid,
    getAllCollectingInvoices,
    getAllDatabaseInvoices,
    markServiceComplete,
    collectingInvoices,
    collectingInvoicesLoading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};