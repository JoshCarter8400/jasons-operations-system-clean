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
import { insertInvoiceWithNumber, insertInvoiceLineItem, getInvoiceWithLineItems, updateInvoiceTotals, deleteInvoiceLineItems, deleteInvoiceSafely, canDeleteInvoice, updateBusinessSettings, addServiceArea as dbAddServiceArea, removeServiceArea as dbRemoveServiceArea, addServiceType as dbAddServiceType, updateServiceType as dbUpdateServiceType, removeServiceType as dbRemoveServiceType, addPaymentMethod as dbAddPaymentMethod, removePaymentMethod as dbRemovePaymentMethod, getAllBusinessSettingsData, updateDatabaseInvoice as dbUpdateDatabaseInvoice, updateInvoiceStatus as dbUpdateInvoiceStatus } from '../utils/databaseHelpers';
// Import to ensure global functions are registered
import '../utils/executeMigration';
import { 
  createCollectingInvoice, 
  addServiceToInvoice, 
  sendCollectingInvoice, 
  markInvoicePaid as dbMarkInvoicePaid, 
  getCollectingInvoiceForClient 
} from '../utils/invoiceHelpers';
import { executeBusinessSettingsMigration, isMigrationCompleted } from '../utils/executeMigration';

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
  
  // Business settings state - loaded from database
  const [businessSettings, setBusinessSettings] = useState({
    businessInfo: null,
    services: [],
    paymentMethods: [],
    serviceAreas: []
  });
  const [businessSettingsLoading, setBusinessSettingsLoading] = useState(true);
  const [businessSettingsLoaded, setBusinessSettingsLoaded] = useState(false);
  
  // Collecting invoices state - cache for performance
  const [collectingInvoices, setCollectingInvoices] = useState({});
  const [collectingInvoicesLoading, setCollectingInvoicesLoading] = useState({});
  
  // CRITICAL BUG FIX: Prevent duplicate invoice creation
  const [invoiceCreationLocks, setInvoiceCreationLocks] = useState(new Set());

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
              await migrateFromLocalStorage(parsed);
              const dbClients = await getClients();
              setClients(dbClients);
              setClientsLoaded(true);
        setClientsLoading(false);
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

  // Load business settings from database on mount
  useEffect(() => {
    const loadBusinessSettings = async () => {
      try {
        setBusinessSettingsLoading(true);
        
        // Check if migration needs to be run
        if (!isMigrationCompleted()) {
            const migrationResult = await executeBusinessSettingsMigration();
          
          if (!migrationResult.success) {
            // Fall back to localStorage data
            setBusinessSettings({
              businessInfo: businessData.businessInfo,
              services: businessData.services,
              paymentMethods: businessData.paymentMethods,
              serviceAreas: businessData.businessInfo.serviceAreas
            });
            setBusinessSettingsLoaded(true);
            setBusinessSettingsLoading(false);
            return;
          }
          
        }
        
        // Load from database
        const dbSettings = await getAllBusinessSettingsData();
        
        setBusinessSettings({
          businessInfo: dbSettings.businessInfo,
          services: dbSettings.services,
          paymentMethods: dbSettings.paymentMethods,
          serviceAreas: dbSettings.serviceAreas
        });
        
        setBusinessSettingsLoaded(true);
        setBusinessSettingsLoading(false);
        
      } catch (error) {
        console.error('Failed to load business settings from database:', error);
        
        // Fallback to localStorage
        setBusinessSettings({
          businessInfo: businessData.businessInfo,
          services: businessData.services,
          paymentMethods: businessData.paymentMethods,
          serviceAreas: businessData.businessInfo.serviceAreas
        });
        
        setBusinessSettingsLoaded(true);
        setBusinessSettingsLoading(false);
      }
    };
    
    loadBusinessSettings();
  }, [businessData]);

  // Save non-client data to localStorage
  useEffect(() => {
    const dataToStore = {
      ...businessData,
      clients: [] // Don't store clients in localStorage anymore
    };
    localStorage.setItem('jasonBusinessData', JSON.stringify(dataToStore));
  }, [businessData]);

  const updateBusinessInfo = async (updates) => {
    try {
      // Update database
      const currentInfo = businessSettings.businessInfo || {};
      const updatedInfo = await updateBusinessSettings({
        name: updates.name || currentInfo.name,
        phone: updates.phone || currentInfo.phone,
        email: updates.email || currentInfo.email,
        address: updates.address !== undefined ? updates.address : currentInfo.address,
        taxRate: updates.taxRate !== undefined ? updates.taxRate : currentInfo.taxRate
      });
      
      // Update local state
      setBusinessSettings(prev => ({
        ...prev,
        businessInfo: {
          ...updatedInfo,
          serviceAreas: prev.serviceAreas // Keep service areas from separate table
        }
      }));
      
      return updatedInfo;
    } catch (error) {
      console.error('Failed to update business info:', error);
      throw error;
    }
  };

  const addServiceArea = async (areaName) => {
    try {
      if (areaName && !businessSettings.serviceAreas.includes(areaName)) {
        await dbAddServiceArea(areaName);
        
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          serviceAreas: [...prev.serviceAreas, areaName]
        }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add service area:', error);
      throw error;
    }
  };

  const removeServiceArea = async (areaName) => {
    try {
      const success = await dbRemoveServiceArea(areaName);
      
      if (success) {
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          serviceAreas: prev.serviceAreas.filter(area => area !== areaName)
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove service area:', error);
      throw error;
    }
  };

  const addService = async (serviceData) => {
    try {
      const { name, priceRange, defaultRate } = serviceData;
      if (name && !businessSettings.services.find(s => s.name === name)) {
        await dbAddServiceType({
          name,
          priceRange: priceRange || '$0-$100',
          defaultRate: defaultRate || 0
        });
        
        // Update local state
        const newService = {
          name,
          priceRange: priceRange || '$0-$100',
          defaultRate: defaultRate || 0
        };
        setBusinessSettings(prev => ({
          ...prev,
          services: [...prev.services, newService]
        }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add service:', error);
      throw error;
    }
  };

  const removeService = async (serviceName) => {
    try {
      const success = await dbRemoveServiceType(serviceName);
      
      if (success) {
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          services: prev.services.filter(s => s.name !== serviceName)
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove service:', error);
      throw error;
    }
  };

  const updateService = async (serviceName, serviceData) => {
    try {
      const success = await dbUpdateServiceType(serviceName, serviceData);
      
      if (success) {
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          services: prev.services.map(s => 
            s.name === serviceName ? { ...s, ...serviceData } : s
          )
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Failed to update service:', error);
      throw error;
    }
  };

  const addPaymentMethod = async (method) => {
    try {
      if (method && !businessSettings.paymentMethods.includes(method)) {
        await dbAddPaymentMethod(method);
        
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          paymentMethods: [...prev.paymentMethods, method]
        }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add payment method:', error);
      throw error;
    }
  };

  const removePaymentMethod = async (method) => {
    try {
      const success = await dbRemovePaymentMethod(method);
      
      if (success) {
        // Update local state
        setBusinessSettings(prev => ({
          ...prev,
          paymentMethods: prev.paymentMethods.filter(m => m !== method)
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      throw error;
    }
  };

  const addClient = async (clientData) => {
    try {
      const newClient = await dbCreateClient({
        ...clientData,
        createdDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
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
      
      // DUPLICATE PREVENTION: Check if customer already has a collecting invoice WITH LINE ITEMS
      // This aligns with UI logic which only shows invoices with line items
      const existingCollecting = await getCollectingInvoiceForClient(invoiceData.clientId);
      if (existingCollecting) {
        // Get full invoice details including line items
        const fullInvoice = await getInvoiceWithLineItems(existingCollecting.id);
        
        // Only prevent creation if the existing invoice has line items (matches UI filtering)
        if (fullInvoice && fullInvoice.line_items && fullInvoice.line_items.length > 0) {
          const client = clients.find(c => c.id === invoiceData.clientId);
          const clientName = client ? client.name : 'Unknown Client';
          throw new Error(
            `Please don't create invoice for ${clientName} - they already have a collecting invoice with ${fullInvoice.line_items.length} service(s). Please add the service to the existing collecting invoice.`
          );
        } else {
          // If there's an empty collecting invoice, we can safely delete it and create a new one
          if (fullInvoice && (!fullInvoice.line_items || fullInvoice.line_items.length === 0)) {
            await deleteInvoiceSafely(existingCollecting.id);
          }
        }
      }
      
      
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
        sent_date: null, // Don't set sent_date for collecting invoices
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

      // Get the complete invoice with line items for caching
      const completeInvoice = await getInvoiceWithLineItems(dbInvoice.id);
      
      // Update the collecting invoices cache so it appears in the UI immediately
      setCollectingInvoices(prev => ({ 
        ...prev, 
        [invoiceData.clientId]: completeInvoice 
      }));

      return completeInvoice;
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

  /**
   * Updates a database invoice (sent/paid invoices) with new data
   * @param {number} invoiceId - Invoice ID to update
   * @param {Object} invoiceData - Updated invoice data with services array
   * @returns {Promise<Object>} Updated invoice
   */
  const updateDatabaseInvoice = async (invoiceId, invoiceData) => {
    try {
      // Update in database
      const updatedInvoice = await dbUpdateDatabaseInvoice(invoiceId, invoiceData);
      
      // No popup - just update successfully
      // The component will handle showing a send button if needed
      
      // Refresh the database invoices cache
      await getAllDatabaseInvoices(true);
      
      return updatedInvoice;
    } catch (error) {
      console.error('Failed to update database invoice:', error);
      throw error;
    }
  };

  const markInvoicePaid = async (id, paymentMethod = '') => {
    // Cache business info once at the start of the function
    const currentBusinessInfo = {
      ...businessSettings.businessInfo,
      phone: businessSettings.businessInfo?.phone || process.env.REACT_APP_JASON_PHONE_NUMBER || 'Phone not configured',
      serviceAreas: businessSettings.serviceAreas,
      paymentMethods: businessSettings.paymentMethods
    };

    const invoice = (businessData.invoices || []).find(inv => inv.id === parseInt(id));
    if (invoice) {
      updateInvoice(id, {
        status: 'Paid',
        paidDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
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
            { ...invoice, status: 'Paid', paidDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) },
            client,
            currentBusinessInfo,
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
    // Cache business info once at the start of the function
    const currentBusinessInfo = {
      ...businessSettings.businessInfo,
      phone: businessSettings.businessInfo?.phone || process.env.REACT_APP_JASON_PHONE_NUMBER || 'Phone not configured',
      serviceAreas: businessSettings.serviceAreas,
      paymentMethods: businessSettings.paymentMethods
    };

    // First check if it's a database invoice (sent/paid invoices are in the database)
    const databaseInvoices = await getAllDatabaseInvoices();
    let invoice = databaseInvoices.find(inv => inv.id === parseInt(id));
    
    // If not found in database, check in-memory invoices
    if (!invoice) {
      invoice = (businessData.invoices || []).find(inv => inv.id === parseInt(id));
      if (invoice) {
        // Update in-memory invoice
        updateInvoice(id, {
          status: 'Sent',
          sentDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
        });
      }
    } else {
      // Update database invoice status and clear modified_since_sent flag
      await dbUpdateInvoiceStatus(parseInt(id), 'sent', new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
      // Refresh to get updated invoice
      const refreshed = await getAllDatabaseInvoices();
      invoice = refreshed.find(inv => inv.id === parseInt(id));
    }
    
    if (invoice) {
      if (method === 'email') {
        const client = businessData.clients.find(c => c.id === invoice.clientId) || 
                      clients.find(c => c.id === invoice.clientId);
        if (client && client.email) {
          const emailResult = await sendInvoiceEmail(
            { ...invoice, status: 'Sent', sentDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) },
            client,
            currentBusinessInfo
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
          const clientName = client?.name || 'Unknown Client';
          createEmailNotification(
            'invoice_warning',
            'No Email Address',
            `Invoice #${invoice.invoice_number || invoice.id} marked as sent - no email address on file for ${clientName}`,
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
   * 
   * PARENT COMPANY LOGIC: If the client has a parent company, this function
   * returns the parent company's collecting invoice instead of the child's
   * 
   * CRITICAL BUG FIX: Added atomic operation protection to prevent duplicate creation
   */
  const getCurrentCollectingInvoice = async (clientId, bypassCache = false) => {
    try {
      console.log(`📄 getCurrentCollectingInvoice called for client ${clientId}`);
      setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: true }));
      
      // Find the client to check for parent company relationship
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Determine target client ID: use parent if exists, otherwise use original client
      const targetClientId = client.parent_company_id || clientId;
      const lockKey = `creating_invoice_${targetClientId}`;
      
      if (client.parent_company_id && client.parent_company_id !== clientId) {
        console.log(`🔄 Invoice routing: Child property "${client.name}" → Parent company (ID: ${targetClientId})`);
      }
      
      // Check cache first (unless bypassing) - use target client ID for cache
      if (!bypassCache && collectingInvoices[targetClientId]) {
        console.log(`💾 Returning cached invoice for target client ${targetClientId}`);
        setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: false }));
        return collectingInvoices[targetClientId];
      }

      // CRITICAL: Check if we're already creating an invoice for this target client
      if (invoiceCreationLocks.has(lockKey)) {
        console.log(`🔒 Invoice creation already in progress for client ${targetClientId}, waiting...`);
        
        // Wait for the creation to complete by polling the cache
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (invoiceCreationLocks.has(lockKey) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
          attempts++;
          
          // Check if invoice appeared in cache
          if (collectingInvoices[targetClientId]) {
            console.log(`✅ Found invoice in cache after waiting for client ${targetClientId}`);
            setCollectingInvoicesLoading(prev => ({ ...prev, [clientId]: false }));
            return collectingInvoices[targetClientId];
          }
        }
        
        // If still locked after waiting, try to get from database
        console.log(`⚠️  Timeout waiting for invoice creation, checking database for client ${targetClientId}`);
      }

      // Try to get existing collecting invoice for the target client (parent or individual)
      let invoice = await getCollectingInvoiceForClient(targetClientId);
      
      if (!invoice) {
        // Set creation lock to prevent duplicates
        console.log(`🔒 Setting creation lock for client ${targetClientId}`);
        setInvoiceCreationLocks(prev => new Set(prev).add(lockKey));
        
        try {
          // Double-check for existing invoice after setting lock (race condition protection)
          invoice = await getCollectingInvoiceForClient(targetClientId);
          
          if (!invoice) {
            // Create new collecting invoice for target client
            const targetClient = targetClientId === clientId ? client : clients.find(c => c.id === targetClientId);
            if (!targetClient) {
              throw new Error('Target client not found');
            }
            
            console.log(`✨ Creating new collecting invoice for client ${targetClientId} (${targetClient.name})`);
            invoice = await createCollectingInvoice(targetClientId, targetClient);
            console.log(`✅ Created invoice ${invoice.id} for client ${targetClientId}`);
          } else {
            console.log(`📄 Found existing invoice after lock check for client ${targetClientId}`);
          }
        } finally {
          // Always remove the lock
          console.log(`🔓 Removing creation lock for client ${targetClientId}`);
          setInvoiceCreationLocks(prev => {
            const newSet = new Set(prev);
            newSet.delete(lockKey);
            return newSet;
          });
        }
      } else {
        console.log(`📄 Found existing collecting invoice ${invoice.id} for client ${targetClientId}`);
        // Get full invoice with line items
        invoice = await getInvoiceWithLineItems(invoice.id);
      }

      // Cache the invoice using the target client ID
      console.log(`💾 Caching invoice ${invoice.id} for target client ${targetClientId}`);
      setCollectingInvoices(prev => ({ ...prev, [targetClientId]: invoice }));
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
   * 
   * PARENT COMPANY LOGIC: If the client has a parent company, the service
   * automatically goes to the parent company's collecting invoice instead
   */
  const addServiceToCollectingInvoice = async (clientId, serviceData) => {
    try {
      console.log(`🛠️  addServiceToCollectingInvoice called for client ${clientId}:`, serviceData);
      
      // Find the client to check for parent company relationship
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Determine target client ID: use parent if exists, otherwise use original client
      const targetClientId = client.parent_company_id || clientId;
      
      // If routing to parent, enhance service description to show property source
      let enhancedServiceData = { ...serviceData };
      if (client.parent_company_id && client.parent_company_id !== clientId) {
        // This is a child property - enhance description to include property name
        enhancedServiceData.description = `${serviceData.description} (${client.name})`;
        
        console.log(`🔄 Service routing: Child property "${client.name}" → Parent company (ID: ${targetClientId})`);
      }
      
      console.log(`📄 Getting collecting invoice for target client ${targetClientId}...`);
      const invoice = await getCurrentCollectingInvoice(targetClientId);
      console.log(`📄 Got invoice ${invoice.id} for target client ${targetClientId}`);

      // CRITICAL FIX: Ensure invoice is fully committed to database before adding line items
      // This prevents "invoice not found" errors when creating new collecting invoices
      const verifiedInvoice = await getInvoiceWithLineItems(invoice.id);
      if (!verifiedInvoice) {
        throw new Error(`Invoice ${invoice.id} not found in database after creation`);
      }
      console.log(`✅ Invoice ${invoice.id} verified and ready for line items`);

      // Calculate service amount WITHOUT tax (tax calculated at invoice level)
      const serviceAmount = enhancedServiceData.quantity * enhancedServiceData.rate;
      
      console.log(`➕ Adding service to invoice ${invoice.id}:`, {
        description: enhancedServiceData.description,
        quantity: enhancedServiceData.quantity,
        rate: enhancedServiceData.rate,
        amount: serviceAmount
      });
      
      // Add service to the invoice
      await addServiceToInvoice(invoice.id, {
        description: enhancedServiceData.description,
        quantity: enhancedServiceData.quantity,
        rate: enhancedServiceData.rate,
        amount: serviceAmount // Store amount without tax
      });

      console.log(`✅ Service added to invoice ${invoice.id}, refreshing cache...`);
      
      // Get updated invoice and refresh cache
      const updatedInvoice = await getInvoiceWithLineItems(invoice.id);
      setCollectingInvoices(prev => ({ ...prev, [targetClientId]: updatedInvoice }));
      
      console.log(`✅ addServiceToCollectingInvoice completed for client ${clientId}`);
      return updatedInvoice;
    } catch (error) {
      console.error(`❌ addServiceToCollectingInvoice failed for client ${clientId}:`, error);
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
      await updateInvoiceTotals(invoiceId, 0); // No tax applied

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
      await updateInvoiceTotals(invoiceId, 0); // No tax applied

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
   * Updates the notes field in a collecting invoice
   * Allows Jason to add special instructions or additional details
   * FIXED: Gracefully handles invoices that are no longer in collecting status
   */
  const updateCollectingInvoiceNotes = async (invoiceId, notes) => {
    try {
      const invoice = await getInvoiceWithLineItems(invoiceId);
      if (!invoice) {
        console.warn(`Invoice ${invoiceId} not found - skipping notes update`);
        return null;
      }

      if (invoice.status !== 'collecting') {
        console.warn(`Invoice ${invoiceId} is no longer in collecting status (${invoice.status}) - skipping notes update`);
        return invoice; // Return invoice as-is rather than throwing error
      }

      // Update notes in database
      const { updateInvoiceFields } = await import('../utils/databaseHelpers');
      await updateInvoiceFields(invoiceId, { notes: notes || '' });

      // Refresh cache
      const updatedInvoice = await getInvoiceWithLineItems(invoiceId);
      const clientId = updatedInvoice.client_id;
      setCollectingInvoices(prev => ({ ...prev, [clientId]: updatedInvoice }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Failed to update collecting invoice notes:', error);
      // Don't re-throw the error - let the calling function handle gracefully
      return null;
    }
  };

  /**
   * Sends a collecting invoice (collecting -> sent)
   * Creates a new collecting invoice for the client automatically
   */
  const sendCollectingInvoiceToClient = async (invoiceId) => {
    try {
      
      // Cache business info once at the start of the function to eliminate performance bottleneck
      const currentBusinessInfo = {
        ...businessSettings.businessInfo,
        serviceAreas: businessSettings.serviceAreas,
        paymentMethods: businessSettings.paymentMethods
      };
      
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
      
      // Clear the collecting invoices cache to force refresh

      // TEMPORARY: SMS disabled during A2P registration - using email only
      // TODO: Re-enable SMS after A2P registration completes
      
      
      /* TEMPORARILY COMMENTED OUT - SMS FUNCTIONALITY
      if (client.phone) {
        const { sendInvoiceSMS } = await import('../services/emailService');
        sendResult = await sendInvoiceSMS(
          result.sentInvoice,
          client,
          businessData.businessInfo
        );
        
        if (sendResult.success) {
          createEmailNotification(
            'invoice_sent',
            'Invoice SMS Sent Successfully!',
            `Invoice #${result.sentInvoice.invoice_number} sent via SMS to ${client.phone}`,
            true
          );
        } else {
          createEmailNotification(
            'invoice_warning',
            'SMS Send Failed',
            `Failed to send SMS to ${client.phone}, trying email...`,
            false
          );
        }
      } else {
      }
      */
      

      // Try email (SMS temporarily disabled)
      if (client.email) {
        
        const emailResult = await sendInvoiceEmail(result.sentInvoice, client, currentBusinessInfo);
        
        if (emailResult.success) {
          createEmailNotification(
            'invoice_sent',
            'Invoice Email Sent Successfully!',
            `Invoice #${result.sentInvoice.invoice_number} sent via email to ${client.email}`,
            true
          );
        } else {
          createEmailNotification(
            'invoice_error',
            'Email Send Failed',
            `Failed to send email to ${client.email}: ${emailResult.error}`,
            false
          );
        }
      } else if (!client.email) {
        createEmailNotification(
          'invoice_warning',
          'No Contact Method Available',
          `Invoice #${result.sentInvoice.invoice_number} marked as sent - no phone or email on file for ${client.name}`,
          false
        );
      } else {
      }

      
      // Return enhanced result with UI update data
      return {
        ...result,
        uiUpdateData: {
          sentInvoice: result.sentInvoice,
          newCollectingInvoice: result.newCollectingInvoice,
          clientId: invoice.client_id,
          clientName: client.name
        }
      };
    } catch (error) {
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
   * Gets all existing collecting invoices from the database
   * CRITICAL FIX: This function only returns existing invoices - it does NOT create new ones
   * This prevents the mass invoice creation bug by avoiding getCurrentCollectingInvoice for all clients
   */
  const getAllCollectingInvoices = async (forceRefresh = false) => {
    try {
      console.log('📋 getAllCollectingInvoices called, forceRefresh:', forceRefresh);
      
      if (forceRefresh) {
        setCollectingInvoices({});
      }
      
      // Get all existing collecting invoices from database (not creating new ones!)
      const { execute } = await import('../utils/database');
      
      const result = await execute(`
        SELECT i.*, 
               COUNT(li.id) as line_item_count
        FROM invoices i
        LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
        WHERE i.status = 'collecting'
        GROUP BY i.id
        HAVING COUNT(li.id) > 0
        ORDER BY i.created_at DESC, i.id DESC
      `);

      // Convert to full invoices with line items
      const collectingInvoices = await Promise.all(
        result.rows.map(async (invoiceRow) => {
          const fullInvoice = await getInvoiceWithLineItems(invoiceRow.id);
          return fullInvoice;
        })
      );

      console.log(`📋 Found ${collectingInvoices.length} existing collecting invoices with line items`);
      
      // Update cache with found invoices
      const newCache = {};
      collectingInvoices.forEach(invoice => {
        newCache[invoice.client_id] = invoice;
      });
      
      if (forceRefresh) {
        setCollectingInvoices(newCache);
      }
      
      return collectingInvoices;
    } catch (error) {
      console.error('Failed to get all collecting invoices:', error);
      return [];
    }
  };

  /**
   * Safely deletes an invoice with proper confirmations and safety checks
   * Only allows deletion of collecting/draft invoices, never sent/paid invoices
   * @param {number} invoiceId - Invoice ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  const deleteInvoice = async (invoiceId) => {
    try {
      
      // First check if the invoice can be safely deleted
      const safetyCheck = await canDeleteInvoice(invoiceId);
      
      if (!safetyCheck.canDelete) {
        throw new Error(safetyCheck.reason);
      }
      
      
      // Perform the actual deletion
      const deleteResult = await deleteInvoiceSafely(invoiceId);
      
      if (deleteResult.success) {
        // Update cache - remove the deleted invoice from collecting invoices
        const clientId = deleteResult.deletedInvoice.id;
        setCollectingInvoices(prev => {
          const updated = { ...prev };
          delete updated[clientId];
          return updated;
        });
        
      }
      
      return deleteResult;
      
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      throw error;
    }
  };

  /**
   * Checks if an invoice can be safely deleted (for UI state)
   * @param {number} invoiceId - Invoice ID to check
   * @returns {Promise<Object>} Safety check result
   */
  const checkCanDeleteInvoice = async (invoiceId) => {
    try {
      return await canDeleteInvoice(invoiceId);
    } catch (error) {
      console.error('Error checking delete permission:', error);
      return {
        canDelete: false,
        reason: `Error: ${error.message}`,
        invoice: null
      };
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

      // Get current date in Eastern timezone for overdue calculations
      const todayString = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const today = new Date(todayString);
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      // Convert database format to UI format
      const invoices = await Promise.all(
        result.rows.map(async (invoice) => {
          // Get line items
          const lineItemsResult = await execute(
            'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY created_at',
            [invoice.id]
          );

          // Calculate overdue status and days overdue
          let isOverdue = false;
          let daysOverdue = 0;
          
          if (invoice.status === 'sent' && invoice.due_date) {
            // Parse due date (format: YYYY-MM-DD)
            const dueDate = new Date(invoice.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            // Add 2 days grace period - invoice becomes overdue on day 3 after due date
            const gracePeriodEnd = new Date(dueDate);
            gracePeriodEnd.setDate(dueDate.getDate() + 2);
            
            // Invoice becomes overdue the day AFTER grace period ends
            const overdueThreshold = new Date(gracePeriodEnd);
            overdueThreshold.setDate(gracePeriodEnd.getDate() + 1);
            
            // Check if today is at or past the overdue threshold
            if (today >= overdueThreshold) {
              isOverdue = true;
              // Calculate days overdue from the overdue threshold
              const timeDiff = today.getTime() - overdueThreshold.getTime();
              daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // Add 1 to count today as day 1
            }
          }

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
            paymentMethod: invoice.payment_method,
            modifiedSinceSent: invoice.modified_since_sent,
            isOverdue: isOverdue,
            daysOverdue: daysOverdue
          };
        })
      );

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
      let description = serviceDetails.description || client.serviceType || 'Service';

      // Append additional notes to description if provided
      if (serviceDetails.additionalNotes && serviceDetails.additionalNotes.trim() !== '') {
        description = `${description} - ${serviceDetails.additionalNotes}`;
      }

      const serviceData = {
        description: description,
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
    businessInfo: businessSettings.businessInfo || businessData.businessInfo,
    services: businessSettings.services.length > 0 ? businessSettings.services : businessData.services,
    serviceAreas: businessSettings.serviceAreas.length > 0 ? businessSettings.serviceAreas : businessData.businessInfo?.serviceAreas || [],
    paymentMethods: businessSettings.paymentMethods.length > 0 ? businessSettings.paymentMethods : businessData.paymentMethods,
    businessSettingsLoading,
    businessSettingsLoaded,
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
    updateDatabaseInvoice,
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
    updateCollectingInvoiceNotes,
    sendCollectingInvoiceToClient,
    markCollectingInvoicePaid,
    getAllCollectingInvoices,
    deleteInvoice,
    checkCanDeleteInvoice,
    getAllDatabaseInvoices,
    markServiceComplete,
    collectingInvoices,
    collectingInvoicesLoading,
    
    // Refresh functions for UI updates
    refreshCollectingInvoices: getAllCollectingInvoices,
    refreshDatabaseInvoices: getAllDatabaseInvoices,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};