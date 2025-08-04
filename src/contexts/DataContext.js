import React, { createContext, useContext, useState, useEffect } from 'react';
import { jasonBusinessData, invoices as initialInvoices } from '../data/jasonData';
import { sendInvoiceEmail, sendPaymentReceiptEmail, createEmailNotification } from '../services/emailService';

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
    const saved = localStorage.getItem('jasonBusinessData');
    return saved ? JSON.parse(saved) : { ...jasonBusinessData, invoices: initialInvoices };
  });

  useEffect(() => {
    localStorage.setItem('jasonBusinessData', JSON.stringify(businessData));
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

  const addClient = (clientData) => {
    const newClient = {
      ...clientData,
      id: Math.max(...businessData.clients.map(c => c.id), 0) + 1,
      createdDate: new Date().toISOString().split('T')[0],
      totalInvoiced: 0,
      totalPaid: 0,
      status: 'Active'
    };
    setBusinessData(prev => ({
      ...prev,
      clients: [...prev.clients, newClient]
    }));
    return newClient;
  };

  const updateClient = (id, clientData) => {
    setBusinessData(prev => ({
      ...prev,
      clients: prev.clients.map(client => 
        client.id === parseInt(id) ? { ...client, ...clientData } : client
      )
    }));
    return true;
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
    return businessData.clients.find(client => client.id === parseInt(id));
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
    if (!searchTerm || searchTerm.trim() === '') return businessData.clients;
    
    const term = searchTerm.toLowerCase().trim();
    return businessData.clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.address.toLowerCase().includes(term) ||
      client.phone.toLowerCase().replace(/[\s\-()]/g, '').includes(term.replace(/[\s\-()]/g, '')) ||
      client.area.toLowerCase().includes(term) ||
      client.serviceType.toLowerCase().includes(term)
    );
  };

  const getClientsWithNoInvoices = () => {
    const clientsWithInvoices = new Set((businessData.invoices || []).map(inv => inv.clientId));
    return businessData.clients.filter(client => !clientsWithInvoices.has(client.id));
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

  const value = {
    businessData,
    businessInfo: businessData.businessInfo,
    services: businessData.services,
    serviceAreas: businessData.businessInfo.serviceAreas,
    paymentMethods: businessData.paymentMethods,
    clients: businessData.clients,
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