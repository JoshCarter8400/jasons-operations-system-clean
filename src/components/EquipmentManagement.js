import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import {
  getEquipment,
  getEquipmentById,
  searchEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentTypes,
  addEquipmentService,
  getEquipmentServiceHistory
} from '../utils/database';

function EquipmentList() {
  const [equipment, setEquipment] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const data = await getEquipment();
      setEquipment(data);
      setError(null);
    } catch (err) {
      setError('Failed to load equipment');
      console.error('Error loading equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    try {
      setLoading(true);
      const data = await searchEquipment(term);
      setEquipment(data);
    } catch (err) {
      setError('Failed to search equipment');
      console.error('Error searching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setEquipmentToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment(equipmentToDelete.id);
      setShowDeleteConfirm(false);
      setEquipmentToDelete(null);
      await loadEquipment(); // Refresh the list
    } catch (err) {
      setError('Failed to delete equipment');
      console.error('Error deleting equipment:', err);
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Needs Work': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Out of Service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <p className="text-red-600">{error}</p>
          <button onClick={loadEquipment} className="btn btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h1 className="card-title">Equipment Management</h1>
            <Link to="/equipment/add" className="btn btn-primary">
              + Add Equipment
            </Link>
          </div>
        </div>
        <div className="card-content">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p>Loading equipment...</p>
            </div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No equipment found.</p>
              <Link to="/equipment/add" className="btn btn-primary mt-4">
                Add Your First Equipment
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {equipment.map((item) => (
                <div key={item.id} className="card">
                  <div className="card-content">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {item.brand} {item.model}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          <span className="font-medium">Type:</span> {item.equipmentType}
                          {item.year && <span> • <span className="font-medium">Year:</span> {item.year}</span>}
                        </p>
                        {item.serialNumber && (
                          <p className="text-gray-600 mb-2">
                            <span className="font-medium">Serial:</span> {item.serialNumber}
                          </p>
                        )}
                        <div className="flex gap-4 text-sm mb-2">
                          {item.currentHours > 0 && (
                            <span><strong>Hours:</strong> {item.currentHours}</span>
                          )}
                          {item.lastServiceDate && (
                            <span><strong>Last Service:</strong> {formatDate(item.lastServiceDate)}</span>
                          )}
                          {item.currentLocation && (
                            <span><strong>Location:</strong> {item.currentLocation}</span>
                          )}
                        </div>
                        {item.nextServiceDueHours && item.currentHours >= item.nextServiceDueHours && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-2 mt-2">
                            <p className="text-red-700 text-sm font-medium">
                              🚨 Service Due - {item.currentHours - item.nextServiceDueHours} hours overdue
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getConditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/equipment/${item.id}`)}
                            className="btn btn-outline btn-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/equipment/${item.id}/edit`)}
                            className="btn btn-primary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && equipmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg max-w-md w-full shadow-2xl border-2 border-red-200">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Equipment</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong className="text-gray-900">{equipmentToDelete.brand} {equipmentToDelete.model}</strong>?
              </p>
              <p className="text-sm text-red-600 font-medium">
                ⚠️ This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Delete Equipment
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEquipmentToDelete(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEquipment() {
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [formData, setFormData] = useState({
    equipmentType: '',
    brand: '',
    model: '',
    year: '',
    serialNumber: '',
    currentHours: '',
    condition: 'Good',
    status: 'Active',
    lastServiceDate: '',
    lastServiceHours: '',
    nextServiceDueHours: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyExpires: '',
    currentLocation: 'Shop',
    notes: '',
    // Equipment-specific specs
    barSize: '',
    chainType: '',
    psi: '',
    licensePlate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadEquipmentTypes();
  }, []);

  const loadEquipmentTypes = async () => {
    try {
      const types = await getEquipmentTypes();
      setEquipmentTypes(types);
    } catch (err) {
      console.error('Error loading equipment types:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const specifications = {};
      if (formData.barSize) specifications.barSize = formData.barSize;
      if (formData.chainType) specifications.chainType = formData.chainType;
      if (formData.psi) specifications.psi = parseInt(formData.psi);
      if (formData.licensePlate) specifications.licensePlate = formData.licensePlate;

      const equipmentData = {
        equipmentType: formData.equipmentType,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        serialNumber: formData.serialNumber,
        currentHours: parseFloat(formData.currentHours) || 0,
        condition: formData.condition,
        status: formData.status,
        lastServiceDate: formData.lastServiceDate || null,
        lastServiceHours: formData.lastServiceHours ? parseFloat(formData.lastServiceHours) : null,
        nextServiceDueHours: formData.nextServiceDueHours ? parseFloat(formData.nextServiceDueHours) : null,
        specifications: Object.keys(specifications).length > 0 ? specifications : null,
        purchaseDate: formData.purchaseDate || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        warrantyExpires: formData.warrantyExpires || null,
        currentLocation: formData.currentLocation,
        notes: formData.notes
      };

      await createEquipment(equipmentData);
      navigate('/equipment');
    } catch (err) {
      setError('Failed to create equipment');
      console.error('Error creating equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const renderSpecificFields = () => {
    switch (formData.equipmentType) {
      case 'Chainsaw':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Bar Size</label>
              <input
                type="text"
                name="barSize"
                value={formData.barSize}
                onChange={handleChange}
                placeholder="e.g., 20 inches"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Chain Type</label>
              <input
                type="text"
                name="chainType"
                value={formData.chainType}
                onChange={handleChange}
                placeholder="e.g., 3/8"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        );
      case 'Pressure Washer':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">PSI Rating</label>
            <input
              type="number"
              name="psi"
              value={formData.psi}
              onChange={handleChange}
              placeholder="e.g., 3000"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        );
      case 'Trailer':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">License Plate</label>
            <input
              type="text"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              placeholder="e.g., ABC123"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/equipment')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Add New Equipment</h1>
          </div>
        </div>
        <div className="card-content">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Equipment Type *</label>
                <select
                  name="equipmentType"
                  required
                  value={formData.equipmentType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select equipment type</option>
                  {equipmentTypes.map(type => (
                    <option key={type.type_name} value={type.type_name}>
                      {type.type_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Brand *</label>
                <input
                  type="text"
                  name="brand"
                  required
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g., Echo, Stihl, Honda"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Model *</label>
                <input
                  type="text"
                  name="model"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., SRM-225, 590 Timber Wolf"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="1990"
                  max="2030"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Serial Number</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            {renderSpecificFields()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Current Hours</label>
                <input
                  type="number"
                  name="currentHours"
                  value={formData.currentHours}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Work">Needs Work</option>
                </select>
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
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Date</label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Price</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Location</label>
              <input
                type="text"
                name="currentLocation"
                value={formData.currentLocation}
                onChange={handleChange}
                placeholder="e.g., Shop, Truck, Job Site"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Any special notes about this equipment..."
              />
            </div>

            <div className="flex gap-4">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Equipment'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/equipment')}
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

function EquipmentDetail() {
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadEquipment();
  }, [id]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const data = await getEquipmentById(parseInt(id));
      if (!data) {
        setError('Equipment not found');
        return;
      }
      setEquipment(data);
    } catch (err) {
      setError('Failed to load equipment');
      console.error('Error loading equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment(parseInt(id));
      navigate('/equipment');
    } catch (err) {
      setError('Failed to delete equipment');
      console.error('Error deleting equipment:', err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Loading equipment...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="card">
        <div className="card-content">
          <p className="text-red-600">{error || 'Equipment not found'}</p>
          <button onClick={() => navigate('/equipment')} className="btn btn-primary mt-4">
            Back to Equipment
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
            <button onClick={() => navigate('/equipment')} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">{equipment.brand} {equipment.model}</h1>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => navigate(`/equipment/${equipment.id}/edit`)}
                className="btn btn-primary"
              >
                Edit Equipment
              </button>
              <button
                onClick={() => navigate(`/equipment/${equipment.id}/service`)}
                className="btn btn-secondary"
              >
                Add Service
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Equipment Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <p className="text-gray-900">{equipment.equipmentType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Brand & Model</label>
                    <p className="text-gray-900">{equipment.brand} {equipment.model}</p>
                  </div>
                  {equipment.year && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Year</label>
                      <p className="text-gray-900">{equipment.year}</p>
                    </div>
                  )}
                  {equipment.serialNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Serial Number</label>
                      <p className="text-gray-900">{equipment.serialNumber}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Condition</label>
                    <p className="text-gray-900">{equipment.condition}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-gray-900">{equipment.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{equipment.currentLocation}</p>
                  </div>
                </div>
              </div>

              {Object.keys(equipment.specifications || {}).length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Specifications</h3>
                  <div className="space-y-3">
                    {equipment.specifications.barSize && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bar Size</label>
                        <p className="text-gray-900">{equipment.specifications.barSize}</p>
                      </div>
                    )}
                    {equipment.specifications.chainType && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Chain Type</label>
                        <p className="text-gray-900">{equipment.specifications.chainType}</p>
                      </div>
                    )}
                    {equipment.specifications.psi && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">PSI Rating</label>
                        <p className="text-gray-900">{equipment.specifications.psi}</p>
                      </div>
                    )}
                    {equipment.specifications.licensePlate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">License Plate</label>
                        <p className="text-gray-900">{equipment.specifications.licensePlate}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Usage & Service</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Hours</label>
                    <p className="text-gray-900">{equipment.currentHours}</p>
                  </div>
                  {equipment.lastServiceDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Service</label>
                      <p className="text-gray-900">{formatDate(equipment.lastServiceDate)}</p>
                    </div>
                  )}
                  {equipment.nextServiceDueHours && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Next Service Due</label>
                      <p className="text-gray-900">{equipment.nextServiceDueHours} hours</p>
                      {equipment.currentHours >= equipment.nextServiceDueHours && (
                        <p className="text-red-600 text-sm mt-1">⚠️ Service overdue</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(equipment.purchaseDate || equipment.purchasePrice) && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Purchase Information</h3>
                  <div className="space-y-3">
                    {equipment.purchaseDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Purchase Date</label>
                        <p className="text-gray-900">{formatDate(equipment.purchaseDate)}</p>
                      </div>
                    )}
                    {equipment.purchasePrice && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Purchase Price</label>
                        <p className="text-gray-900">${equipment.purchasePrice.toFixed(2)}</p>
                      </div>
                    )}
                    {equipment.warrantyExpires && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Warranty Expires</label>
                        <p className="text-gray-900">{formatDate(equipment.warrantyExpires)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {equipment.notes && (
            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-4">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-900">{equipment.notes}</p>
              </div>
            </div>
          )}

          {equipment.serviceHistory && equipment.serviceHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-4">Service History</h3>
              <div className="space-y-4">
                {equipment.serviceHistory.map((service, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{service.serviceType}</p>
                        <p className="text-sm text-gray-600">{formatDate(service.serviceDate)}</p>
                      </div>
                      <div className="text-right">
                        {service.hoursAtService && (
                          <p className="text-sm text-gray-600">{service.hoursAtService} hours</p>
                        )}
                        {service.cost > 0 && (
                          <p className="text-sm text-gray-600">${service.cost.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-900">{service.description}</p>
                    {service.performedBy && (
                      <p className="text-sm text-gray-600 mt-1">By: {service.performedBy}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">Delete Equipment</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this equipment? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditEquipment() {
  const [equipment, setEquipment] = useState(null);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [equipmentData, types] = await Promise.all([
        getEquipmentById(parseInt(id)),
        getEquipmentTypes()
      ]);
      
      if (!equipmentData) {
        setError('Equipment not found');
        return;
      }

      setEquipment(equipmentData);
      setEquipmentTypes(types);
      
      const specs = equipmentData.specifications || {};
      setFormData({
        equipmentType: equipmentData.equipmentType || '',
        brand: equipmentData.brand || '',
        model: equipmentData.model || '',
        year: equipmentData.year ? equipmentData.year.toString() : '',
        serialNumber: equipmentData.serialNumber || '',
        currentHours: equipmentData.currentHours ? equipmentData.currentHours.toString() : '',
        condition: equipmentData.condition || 'Good',
        status: equipmentData.status || 'Active',
        lastServiceDate: equipmentData.lastServiceDate || '',
        lastServiceHours: equipmentData.lastServiceHours ? equipmentData.lastServiceHours.toString() : '',
        nextServiceDueHours: equipmentData.nextServiceDueHours ? equipmentData.nextServiceDueHours.toString() : '',
        purchaseDate: equipmentData.purchaseDate || '',
        purchasePrice: equipmentData.purchasePrice ? equipmentData.purchasePrice.toString() : '',
        warrantyExpires: equipmentData.warrantyExpires || '',
        currentLocation: equipmentData.currentLocation || 'Shop',
        notes: equipmentData.notes || '',
        barSize: specs.barSize || '',
        chainType: specs.chainType || '',
        psi: specs.psi ? specs.psi.toString() : '',
        licensePlate: specs.licensePlate || ''
      });
    } catch (err) {
      setError('Failed to load equipment');
      console.error('Error loading equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const specifications = {};
      if (formData.barSize) specifications.barSize = formData.barSize;
      if (formData.chainType) specifications.chainType = formData.chainType;
      if (formData.psi) specifications.psi = parseInt(formData.psi);
      if (formData.licensePlate) specifications.licensePlate = formData.licensePlate;

      const equipmentData = {
        equipmentType: formData.equipmentType,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        serialNumber: formData.serialNumber,
        currentHours: parseFloat(formData.currentHours) || 0,
        condition: formData.condition,
        status: formData.status,
        lastServiceDate: formData.lastServiceDate || null,
        lastServiceHours: formData.lastServiceHours ? parseFloat(formData.lastServiceHours) : null,
        nextServiceDueHours: formData.nextServiceDueHours ? parseFloat(formData.nextServiceDueHours) : null,
        specifications: Object.keys(specifications).length > 0 ? specifications : null,
        purchaseDate: formData.purchaseDate || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        warrantyExpires: formData.warrantyExpires || null,
        currentLocation: formData.currentLocation,
        notes: formData.notes
      };

      await updateEquipment(parseInt(id), equipmentData);
      navigate(`/equipment/${id}`);
    } catch (err) {
      setError('Failed to update equipment');
      console.error('Error updating equipment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const renderSpecificFields = () => {
    switch (formData.equipmentType) {
      case 'Chainsaw':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Bar Size</label>
              <input
                type="text"
                name="barSize"
                value={formData.barSize}
                onChange={handleChange}
                placeholder="e.g., 20 inches"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Chain Type</label>
              <input
                type="text"
                name="chainType"
                value={formData.chainType}
                onChange={handleChange}
                placeholder="e.g., 3/8"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        );
      case 'Pressure Washer':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">PSI Rating</label>
            <input
              type="number"
              name="psi"
              value={formData.psi}
              onChange={handleChange}
              placeholder="e.g., 3000"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        );
      case 'Trailer':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">License Plate</label>
            <input
              type="text"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              placeholder="e.g., ABC123"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-content">
          <p>Loading equipment...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="card">
        <div className="card-content">
          <p className="text-red-600">{error || 'Equipment not found'}</p>
          <button onClick={() => navigate('/equipment')} className="btn btn-primary mt-4">
            Back to Equipment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/equipment/${id}`)} className="btn btn-outline">
              ← Back
            </button>
            <h1 className="card-title">Edit Equipment: {equipment.brand} {equipment.model}</h1>
          </div>
        </div>
        <div className="card-content">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Equipment Type *</label>
                <select
                  name="equipmentType"
                  required
                  value={formData.equipmentType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select equipment type</option>
                  {equipmentTypes.map(type => (
                    <option key={type.type_name} value={type.type_name}>
                      {type.type_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Brand *</label>
                <input
                  type="text"
                  name="brand"
                  required
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Model *</label>
                <input
                  type="text"
                  name="model"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="1990"
                  max="2030"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Serial Number</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            {renderSpecificFields()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Current Hours</label>
                <input
                  type="number"
                  name="currentHours"
                  value={formData.currentHours}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Work">Needs Work</option>
                </select>
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
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Last Service Date</label>
                <input
                  type="date"
                  name="lastServiceDate"
                  value={formData.lastServiceDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hours at Last Service</label>
                <input
                  type="number"
                  name="lastServiceHours"
                  value={formData.lastServiceHours}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Next Service Due (Hours)</label>
                <input
                  type="number"
                  name="nextServiceDueHours"
                  value={formData.nextServiceDueHours}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Date</label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Price</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Location</label>
              <input
                type="text"
                name="currentLocation"
                value={formData.currentLocation}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-4">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Equipment'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/equipment/${id}`)}
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

function EquipmentManagement() {
  return (
    <Routes>
      <Route path="/" element={<EquipmentList />} />
      <Route path="/add" element={<AddEquipment />} />
      <Route path="/:id" element={<EquipmentDetail />} />
      <Route path="/:id/edit" element={<EditEquipment />} />
    </Routes>
  );
}

export default EquipmentManagement;