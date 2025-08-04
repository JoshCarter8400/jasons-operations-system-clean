import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import SearchableClientDropdown from './SearchableClientDropdown';
import { createEmailNotification } from '../services/emailService';

function DailySchedule() {
  const { clients, updateClient, scheduleService, serviceAreas, services } = useData();
  
  // Fix date display - today should show August 2, 2025
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('scheduled'); // 'scheduled', 'all', 'area', 'schedule'
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    client: null,
    date: selectedDate,
    time: '09:00',
    duration: '1.5',
    serviceType: '',
    area: '',
    notes: ''
  });
  
  // Get clients scheduled for the selected date
  const getScheduledClients = (date) => {
    return clients.filter(client => {
      if (!client.nextService) return false;
      return client.nextService === date;
    });
  };

  // Get clients by upcoming services (next 7 days)
  const getUpcomingClients = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return clients.filter(client => {
      if (!client.nextService) return false;
      const nextServiceDate = new Date(client.nextService + 'T12:00:00');
      return nextServiceDate >= today && nextServiceDate <= nextWeek;
    }).sort((a, b) => new Date(a.nextService + 'T12:00:00') - new Date(b.nextService + 'T12:00:00'));
  };

  // Group clients by area
  const groupClientsByArea = (clientList) => {
    return clientList.reduce((groups, client) => {
      if (!groups[client.area]) {
        groups[client.area] = [];
      }
      groups[client.area].push(client);
      return groups;
    }, {});
  };

  const scheduledClients = getScheduledClients(selectedDate);
  const upcomingClients = getUpcomingClients();
  const clientsByArea = groupClientsByArea(scheduledClients);

  // Calculate estimated work time for scheduled clients
  const timePerService = {
    'Weekly Mowing': 1.5,
    'Bi-weekly Mowing': 1.5,
    'Hedge Trimming': 2.5,
    'Tree Trimming': 4.0,
    'Weed Control': 1.0,
    'Pressure Washing': 3.0,
    'Mulch Application': 2.0,
    'Landscape Reconstruction': 6.0,
    'Deep Root Fertilization': 1.5,
    'Gutter Cleaning': 2.0
  };

  const totalEstimatedTime = scheduledClients.reduce((sum, client) => {
    const duration = client.lastScheduled?.duration ? parseFloat(client.lastScheduled.duration) : timePerService[client.serviceType] || 2.0;
    return sum + duration;
  }, 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isToday = (dateString) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateString === tomorrow.toISOString().split('T')[0];
  };


  // Scheduling functions
  const handleScheduleService = (e) => {
    e.preventDefault();
    if (!scheduleForm.client || !scheduleForm.date || !scheduleForm.time) {
      createEmailNotification(
        'error',
        'Missing Information',
        'Please select a client, date, and time',
        false
      );
      return;
    }

    const success = scheduleService(
      scheduleForm.client.id,
      scheduleForm.date,
      scheduleForm.time,
      scheduleForm.notes,
      scheduleForm.duration,
      scheduleForm.serviceType || scheduleForm.client.serviceType,
      scheduleForm.area || scheduleForm.client.area
    );
    
    if (success) {
      createEmailNotification(
        'success',
        'Service Scheduled!',
        `${scheduleForm.client.name} scheduled for ${scheduleForm.date} at ${scheduleForm.time}`,
        true
      );
      setShowScheduleForm(false);
      setScheduleForm({
        client: null,
        date: selectedDate,
        time: '09:00',
        duration: '1.5',
        serviceType: '',
        area: '',
        notes: ''
      });
    }
  };

  const rescheduleClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      // Set up form for direct editing
      setScheduleForm({
        client: client,
        date: client.nextService || selectedDate,
        time: client.lastScheduled?.time || '09:00',
        duration: client.lastScheduled?.duration || (timePerService[client.serviceType] || 2.0).toString(),
        serviceType: client.serviceType,
        area: client.area,
        notes: client.lastScheduled?.notes || ''
      });
      setShowScheduleForm(true);
    }
  };

  const handleClientChange = (client) => {
    if (client) {
      setScheduleForm({
        ...scheduleForm,
        client: client,
        serviceType: client.serviceType,
        area: client.area,
        duration: timePerService[client.serviceType]?.toString() || '2.0'
      });
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="card-title">Daily Schedule</h1>
              <p className="text-gray-600">Plan and track your daily service appointments</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowScheduleForm(true)}
                className="btn btn-primary btn-sm"
              >
                + Schedule Service
              </button>
              <button
                onClick={() => setViewMode('scheduled')}
                className={`btn btn-sm ${viewMode === 'scheduled' ? 'btn-primary' : 'btn-outline'}`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('area')}
                className={`btn btn-sm ${viewMode === 'area' ? 'btn-primary' : 'btn-outline'}`}
              >
                By Area
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          
          {/* Schedule Service Form Modal */}
          {showScheduleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-semibold mb-4">Schedule New Service</h3>
                <form onSubmit={handleScheduleService}>
                  <div className="mb-4">
                    <SearchableClientDropdown
                      selectedClient={scheduleForm.client}
                      onClientChange={handleClientChange}
                      clients={clients}
                      placeholder="Type to search and select client..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Service Date</label>
                      <input
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Time</label>
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Service Type</label>
                      <select
                        value={scheduleForm.serviceType}
                        onChange={(e) => setScheduleForm({...scheduleForm, serviceType: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="">Use client default</option>
                        {services.map(service => (
                          <option key={service.name} value={service.name}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Area</label>
                      <select
                        value={scheduleForm.area}
                        onChange={(e) => setScheduleForm({...scheduleForm, area: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="">Use client default</option>
                        {serviceAreas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Estimated Duration (hours)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="8"
                      value={scheduleForm.duration}
                      onChange={(e) => setScheduleForm({...scheduleForm, duration: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      placeholder="1.5"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Special instructions, access notes, etc..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="btn btn-primary flex-1">
                      Schedule Service
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="btn btn-outline flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Date Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const prevDate = new Date(selectedDate);
                  prevDate.setDate(prevDate.getDate() - 1);
                  setSelectedDate(prevDate.toISOString().split('T')[0]);
                }}
                className="btn btn-outline btn-sm"
              >
                ← Previous Day
              </button>
              <div className="text-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md"
                />
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(selectedDate)}
                  {isToday(selectedDate) && <span className="text-green-600 font-medium"> (Today)</span>}
                  {isTomorrow(selectedDate) && <span className="text-blue-600 font-medium"> (Tomorrow)</span>}
                </p>
              </div>
              <button
                onClick={() => {
                  const nextDate = new Date(selectedDate);
                  nextDate.setDate(nextDate.getDate() + 1);
                  setSelectedDate(nextDate.toISOString().split('T')[0]);
                }}
                className="btn btn-outline btn-sm"
              >
                Next Day →
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {scheduledClients.length} service{scheduledClients.length !== 1 ? 's' : ''} scheduled
              </p>
              <p className="text-sm text-gray-600">
                Est. {totalEstimatedTime.toFixed(1)} hours total
              </p>
            </div>
          </div>

          {/* Main Content Based on View Mode */}
          {viewMode === 'scheduled' && (
            <div>
              <h3 className="font-semibold text-lg mb-4">
                Scheduled for {formatDate(selectedDate)}
              </h3>
              
              {scheduledClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No services scheduled for this date</p>
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    className="btn btn-primary"
                  >
                    Schedule a Service
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {scheduledClients.map((client) => (
                    <div key={client.id} className="card">
                      <div className="card-content">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h4 className="font-semibold text-lg">{client.name}</h4>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {client.area}
                              </span>
                              {client.lastScheduled?.time && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  {client.lastScheduled.time}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-1">{client.address}</p>
                            <div className="flex gap-6 text-sm text-gray-600 mb-2">
                              <span><strong>Service:</strong> {client.lastScheduled?.serviceType || client.serviceType}</span>
                              <span><strong>Phone:</strong> {client.phone}</span>
                              {client.lastScheduled?.duration && (
                                <span><strong>Duration:</strong> {client.lastScheduled.duration}h</span>
                              )}
                            </div>
                            {(client.notes || client.lastScheduled?.notes) && (
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <strong>Notes:</strong> {client.lastScheduled?.notes || client.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => rescheduleClient(client.id)}
                              className="btn btn-outline btn-sm"
                            >
                              Edit Service
                            </button>
                            <button
                              onClick={() => {
                                updateClient(client.id, { lastService: selectedDate, nextService: null });
                                createEmailNotification(
                                  'success',
                                  'Service Completed!',
                                  `${client.name} marked as completed for ${selectedDate}`,
                                  true
                                );
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Mark Complete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'all' && (
            <div>
              <h3 className="font-semibold text-lg mb-4">Upcoming Services (Next 7 Days)</h3>
              
              {upcomingClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No services scheduled for the next 7 days</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {upcomingClients.map((client) => (
                    <div key={client.id} className="card">
                      <div className="card-content">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h4 className="font-semibold text-lg">{client.name}</h4>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {client.area}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                isToday(client.nextService) ? 'bg-green-100 text-green-800' :
                                isTomorrow(client.nextService) ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {getDayOfWeek(client.nextService)} {client.nextService}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-1">{client.address}</p>
                            <div className="flex gap-6 text-sm text-gray-600">
                              <span><strong>Service:</strong> {client.serviceType}</span>
                              <span><strong>Phone:</strong> {client.phone}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => setSelectedDate(client.nextService)}
                              className="btn btn-outline btn-sm"
                            >
                              View Day
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'area' && (
            <div>
              <h3 className="font-semibold text-lg mb-4">
                Services by Area - {formatDate(selectedDate)}
              </h3>
              
              {Object.keys(clientsByArea).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No services scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(clientsByArea).map(([area, areaClients]) => (
                    <div key={area} className="card">
                      <div className="card-header">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {area}
                          </span>
                          <span className="text-sm text-gray-600">
                            ({areaClients.length} service{areaClients.length !== 1 ? 's' : ''})
                          </span>
                        </h4>
                      </div>
                      <div className="card-content">
                        <div className="grid gap-3">
                          {areaClients.map((client) => (
                            <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-gray-600">{client.address}</p>
                                <p className="text-sm text-gray-600">{client.serviceType}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{client.phone}</p>
                                {client.lastScheduled?.time && (
                                  <p className="text-sm font-medium text-green-600">{client.lastScheduled.time}</p>
                                )}
                              </div>
                            </div>
                          ))}
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
    </div>
  );
}

export default DailySchedule;