import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

function BusinessSettings() {
  const {
    businessInfo,
    services,
    serviceAreas,
    paymentMethods,
    businessSettingsLoading,
    updateBusinessInfo,
    addServiceArea,
    removeServiceArea,
    addService,
    removeService,
    updateService,
    addPaymentMethod,
    removePaymentMethod
  } = useData();

  const [newServiceArea, setNewServiceArea] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    priceRange: '',
    defaultRate: ''
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [editingBusinessInfo, setEditingBusinessInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAddServiceArea = async (e) => {
    e.preventDefault();
    if (newServiceArea.trim()) {
      setActionLoading(true);
      try {
        const success = await addServiceArea(newServiceArea.trim());
        if (success) {
          setNewServiceArea('');
        } else {
          alert('Service area already exists or invalid name');
        }
      } catch (error) {
        alert(`Failed to add service area: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleRemoveServiceArea = async (areaName) => {
    if (window.confirm(`Are you sure you want to remove service area "${areaName}"?`)) {
      setActionLoading(true);
      try {
        await removeServiceArea(areaName);
      } catch (error) {
        alert(`Failed to remove service area: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (newService.name.trim()) {
      setActionLoading(true);
      try {
        const serviceData = {
          name: newService.name.trim(),
          priceRange: newService.priceRange.trim() || '$0-$100',
          defaultRate: parseFloat(newService.defaultRate) || 0
        };
        
        const success = await addService(serviceData);
        if (success) {
          setNewService({ name: '', priceRange: '', defaultRate: '' });
        } else {
          alert('Service already exists or invalid data');
        }
      } catch (error) {
        alert(`Failed to add service: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleRemoveService = (serviceName) => {
    if (window.confirm(`Are you sure you want to remove service "${serviceName}"?`)) {
      removeService(serviceName);
    }
  };

  const handleEditService = (service) => {
    setEditingService({ ...service });
  };

  const handleUpdateService = (e) => {
    e.preventDefault();
    if (editingService) {
      updateService(editingService.name, {
        priceRange: editingService.priceRange,
        defaultRate: parseFloat(editingService.defaultRate) || 0
      });
      setEditingService(null);
    }
  };

  const handleAddPaymentMethod = (e) => {
    e.preventDefault();
    if (newPaymentMethod.trim()) {
      const success = addPaymentMethod(newPaymentMethod.trim());
      if (success) {
        setNewPaymentMethod('');
      } else {
        alert('Payment method already exists');
      }
    }
  };

  const handleRemovePaymentMethod = (method) => {
    if (window.confirm(`Are you sure you want to remove payment method "${method}"?`)) {
      removePaymentMethod(method);
    }
  };

  const handleEditBusinessInfo = () => {
    setEditingBusinessInfo({
      name: businessInfo.name,
      phone: businessInfo.phone,
      email: businessInfo.email,
      address: businessInfo.address || '',
      taxRate: businessInfo.taxRate
    });
  };

  const handleUpdateBusinessInfo = async (e) => {
    e.preventDefault();
    if (editingBusinessInfo) {
      setActionLoading(true);
      try {
        await updateBusinessInfo({
          name: editingBusinessInfo.name,
          phone: editingBusinessInfo.phone,
          email: editingBusinessInfo.email,
          address: editingBusinessInfo.address,
          taxRate: parseFloat(editingBusinessInfo.taxRate) || 0
        });
        setEditingBusinessInfo(null);
      } catch (error) {
        alert(`Failed to update business information: ${error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Show loading state while business settings are loading
  if (businessSettingsLoading) {
    return (
      <div>
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Business Settings</h1>
            <p className="text-gray-600">Loading business settings...</p>
          </div>
          <div className="card-content">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="loading-spinner mb-4"></div>
                <p className="text-gray-600">Loading business configuration from database...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Business Settings</h1>
          <p className="text-gray-600">Manage your business information, service areas, services, and payment methods</p>
        </div>
        <div className="card-content space-y-8">
          
          {/* Business Information */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Business Information</h2>
              {!editingBusinessInfo && (
                <button
                  onClick={handleEditBusinessInfo}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
              )}
            </div>

            {editingBusinessInfo ? (
              <form onSubmit={handleUpdateBusinessInfo} className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Name *</label>
                    <input
                      type="text"
                      value={editingBusinessInfo.name}
                      onChange={(e) => setEditingBusinessInfo({...editingBusinessInfo, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      type="text"
                      value={editingBusinessInfo.phone}
                      onChange={(e) => setEditingBusinessInfo({...editingBusinessInfo, phone: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={editingBusinessInfo.email}
                      onChange={(e) => setEditingBusinessInfo({...editingBusinessInfo, email: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <input
                      type="text"
                      value={editingBusinessInfo.address}
                      onChange={(e) => setEditingBusinessInfo({...editingBusinessInfo, address: e.target.value})}
                      placeholder="Business address"
                      className="w-full p-3 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      value={editingBusinessInfo.taxRate}
                      onChange={(e) => setEditingBusinessInfo({...editingBusinessInfo, taxRate: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingBusinessInfo(null)}
                    className="btn btn-outline"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Name</label>
                    <p className="font-medium">{businessInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="font-medium">{businessInfo.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="font-medium">{businessInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="font-medium">{businessInfo.address || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tax Rate</label>
                    <p className="font-medium">{(businessInfo.taxRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service Areas Management */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Service Areas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Current Service Areas</h3>
                <div className="space-y-2">
                  {serviceAreas.map((area) => (
                    <div key={area} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{area}</span>
                      <button
                        onClick={() => handleRemoveServiceArea(area)}
                        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Add New Service Area</h3>
                <form onSubmit={handleAddServiceArea} className="space-y-3">
                  <input
                    type="text"
                    value={newServiceArea}
                    onChange={(e) => setNewServiceArea(e.target.value)}
                    placeholder="Enter new service area (e.g., 'Tampa', 'Venice')"
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                  <button type="submit" className="btn btn-primary w-full">
                    Add Service Area
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Services Management */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Current Services</h3>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <div key={service.name} className="border border-gray-200 rounded-md p-4">
                      {editingService && editingService.name === service.name ? (
                        <form onSubmit={handleUpdateService} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-sm font-medium mb-1">Service Name</label>
                            <input 
                              type="text" 
                              value={editingService.name} 
                              disabled 
                              className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Price Range</label>
                            <input
                              type="text"
                              value={editingService.priceRange}
                              onChange={(e) => setEditingService({...editingService, priceRange: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Default Rate</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingService.defaultRate}
                              onChange={(e) => setEditingService({...editingService, defaultRate: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="btn btn-primary btn-sm">Save</button>
                            <button 
                              type="button" 
                              onClick={() => setEditingService(null)}
                              className="btn btn-outline btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="font-medium">{service.name}</span>
                            </div>
                            <div className="text-gray-600">
                              {service.priceRange}
                            </div>
                            <div className="text-gray-600">
                              Default: ${service.defaultRate.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className="btn btn-outline btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveService(service.name)}
                              className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Add New Service</h3>
                <form onSubmit={handleAddService} className="border border-gray-200 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium mb-2">Service Name *</label>
                      <input
                        type="text"
                        value={newService.name}
                        onChange={(e) => setNewService({...newService, name: e.target.value})}
                        placeholder="e.g., Pool Cleaning"
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Price Range</label>
                      <input
                        type="text"
                        value={newService.priceRange}
                        onChange={(e) => setNewService({...newService, priceRange: e.target.value})}
                        placeholder="e.g., $50-$150"
                        className="w-full p-3 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newService.defaultRate}
                        onChange={(e) => setNewService({...newService, defaultRate: e.target.value})}
                        placeholder="0.00"
                        className="w-full p-3 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <button type="submit" className="btn btn-primary w-full">
                        Add Service
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Payment Methods Management */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Current Payment Methods</h3>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{method}</span>
                      <button
                        onClick={() => handleRemovePaymentMethod(method)}
                        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Add New Payment Method</h3>
                <form onSubmit={handleAddPaymentMethod} className="space-y-3">
                  <input
                    type="text"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    placeholder="Enter new payment method (e.g., 'PayPal', 'Wire Transfer')"
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                  <button type="submit" className="btn btn-primary w-full">
                    Add Payment Method
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessSettings;