import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';


function ClientList() {
  const { searchClients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredClients = searchClients(searchTerm);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h1 className="card-title">Client Management</h1>
            <Link to="/clients/add" className="btn btn-primary">
              + Add Client
            </Link>
          </div>
        </div>
        <div className="card-content">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="card">
                <div className="card-content">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{client.name}</h3>
                      <p className="text-gray-600 mb-1">{client.address}</p>
                      <p className="text-gray-600 mb-1">{client.phone}</p>
                      <p className="text-gray-600 mb-2">{client.email}</p>
                      <div className="flex gap-4 text-sm">
                        <span><strong>Service:</strong> {client.serviceType}</span>
                        <span><strong>Last:</strong> {client.lastService}</span>
                        <span><strong>Next:</strong> {client.nextService}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="btn btn-outline btn-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                          className="btn btn-primary btn-sm"
                        >
                          Edit
                        </button>
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

function AddClient() {
  const { services, serviceAreas, paymentMethods, addClient } = useData();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    area: '',
    phone: '',
    email: '',
    serviceType: '',
    paymentMethod: '',
    notes: ''
  });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const newClient = addClient(formData);
    console.log('Added client:', newClient);
    navigate('/clients');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/clients')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Add New Client</h1>
          </div>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Client Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Address *</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Area *</label>
              <select
                name="area"
                required
                value={formData.area}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              >
                <option value="">Select area</option>
                {serviceAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service Type *</label>
                <select
                  name="serviceType"
                  required
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select service type</option>
                  {services.map(service => (
                    <option key={service.name} value={service.name}>{service.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method *</label>
                <select
                  name="paymentMethod"
                  required
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Any special instructions or notes about this client..."
              />
            </div>
            
            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary">
                Add Client
              </button>
              <button
                type="button"
                onClick={() => navigate('/clients')}
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

function ClientDetail() {
  const { getClientById } = useData();
  const { id } = useParams();
  const navigate = useNavigate();
  const client = getClientById(parseInt(id));

  if (!client) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Client not found</p>
          <button onClick={() => navigate('/clients')} className="btn btn-primary mt-4">
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => navigate('/clients')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">{client.name}</h1>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => navigate(`/clients/${client.id}/edit`)}
                className="btn btn-primary"
              >
                Edit Client
              </button>
              <button
                onClick={() => navigate(`/invoicing/create?client=${client.id}`)}
                className="btn btn-secondary"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-gray-900">{client.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Area</label>
                    <p className="text-gray-900">{client.area}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">
                      <a href={`tel:${client.phone}`} className="text-primary hover:underline">
                        {client.phone}
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">
                      <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                        {client.email}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Service Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Service Type</label>
                    <p className="text-gray-900">{client.serviceType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Method</label>
                    <p className="text-gray-900">{client.paymentMethod}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Service</label>
                    <p className="text-gray-900">{client.lastService}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Next Service</label>
                    <p className="text-gray-900">{client.nextService}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {client.notes && (
            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-4">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-900">{client.notes}</p>
              </div>
            </div>
          )}
          
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-600">No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditClient() {
  const { services, serviceAreas, paymentMethods, getClientById, updateClient } = useData();
  const { id } = useParams();
  const navigate = useNavigate();
  const client = getClientById(parseInt(id));
  
  const [formData, setFormData] = useState({
    name: client?.name || '',
    address: client?.address || '',
    area: client?.area || '',
    phone: client?.phone || '',
    email: client?.email || '',
    serviceType: client?.serviceType || '',
    paymentMethod: client?.paymentMethod || '',
    status: client?.status || 'Active',
    notes: client?.notes || ''
  });

  if (!client) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Client not found</p>
          <button onClick={() => navigate('/clients')} className="btn btn-primary mt-4">
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = updateClient(parseInt(id), formData);
    if (success) {
      console.log('Updated client:', formData);
      navigate(`/clients/${id}`);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/clients/${id}`)} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Edit Client: {client.name}</h1>
          </div>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Client Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Address *</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Area *</label>
                <select
                  name="area"
                  required
                  value={formData.area}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select area</option>
                  {serviceAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Service Type *</label>
                <select
                  name="serviceType"
                  required
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select service type</option>
                  {services.map(service => (
                    <option key={service.name} value={service.name}>{service.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method *</label>
                <select
                  name="paymentMethod"
                  required
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Any special instructions or notes about this client..."
              />
            </div>
            
            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary">
                Update Client
              </button>
              <button
                type="button"
                onClick={() => navigate(`/clients/${id}`)}
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

function ClientManagement() {
  return (
    <Routes>
      <Route path="/" element={<ClientList />} />
      <Route path="/add" element={<AddClient />} />
      <Route path="/:id" element={<ClientDetail />} />
      <Route path="/:id/edit" element={<EditClient />} />
    </Routes>
  );
}

export default ClientManagement;