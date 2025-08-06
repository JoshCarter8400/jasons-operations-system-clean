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

  const addInvoice = (invoiceData) => {
    const newInvoice = {
      ...invoiceData,
      id: Math.max(...(businessData.invoices || []).map(inv => inv.id), 1000) + 1,
      status: 'Draft',
      sentDate: null,
      paidDate: null
    };
    setBusinessData(prev => ({
      ...prev,
      invoices: [...(prev.invoices || []), newInvoice]
    }));
    return newInvoice;
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
              `Receipt for Invoice #${invoice.id} sent to ${client.email}`,
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
              `Invoice #${invoice.id} sent to ${client.email}`,
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
            `Invoice #${invoice.id} marked as sent - no email address on file for ${businessData.clients.find(c => c.id === invoice.clientId)?.name}`,
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
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};