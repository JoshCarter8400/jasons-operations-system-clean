import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { createEmailNotification } from '../services/emailService';
import {
  getAppointmentsByDate,
  updateAppointmentStatus,
  rescheduleAppointment,
  initializeAppointmentsTable,
  createAppointmentsFromForm,
  deleteAppointment,
  deleteAllFutureAppointments,
} from '../utils/databaseHelpers';
import MarkServiceComplete from './MarkServiceComplete';

function DailySchedule() {
  const { clients, serviceAreas, services } = useData();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState('scheduled');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    appointmentId: null,
    client: null,
    date: selectedDate,
    time: '09:00',
    duration: '1.5',
    serviceType: '',
    area: '',
    notes: '',
    recurring: 'One-time',
    recurringDay: 'Monday',
  });

  // Load week appointments
  const loadWeekAppointments = useCallback(async () => {
    try {
      const weekData = await getWeekAppointments(selectedDate);
      setWeekAppointments(weekData);
    } catch (error) {
      console.error('❌ Failed to load week appointments:', error);
      setWeekAppointments([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    initializeSystem();
  }, []);

  useEffect(() => {
    if (viewMode === 'all') {
      loadWeekAppointments();
    } else {
      loadAppointmentsForDate(selectedDate);
    }
  }, [selectedDate, viewMode, loadWeekAppointments]);

  // Initialize the appointment system
  const initializeSystem = async () => {
    try {
      await initializeAppointmentsTable();
    } catch (error) {
      console.error('❌ Failed to initialize system:', error);
      createEmailNotification(
        'error',
        'System Error',
        'Failed to initialize appointment system',
        false
      );
    }
  };

  // Load appointments for a specific date
  const loadAppointmentsForDate = async (date) => {
    try {
      const appointmentData = await getAppointmentsByDate(date);
      setAppointments(appointmentData);
    } catch (error) {
      console.error('❌ Failed to load appointments:', error);
      setAppointments([]);
    }
  };

  // Get week appointments starting from selected date
  const getWeekAppointments = async (startDate) => {
    const weekAppointments = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate + 'T12:00:00');
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const dayAppointments = await getAppointmentsByDate(dateStr);
        weekAppointments.push({
          date: dateStr,
          appointments: dayAppointments.filter(apt => apt.status === 'scheduled')
        });
      } catch (error) {
        console.error(`Failed to load appointments for ${dateStr}:`, error);
        weekAppointments.push({
          date: dateStr,
          appointments: []
        });
      }
    }

    return weekAppointments;
  };

  // Group appointments by area
  const groupAppointmentsByArea = (appointmentList) => {
    return appointmentList.reduce((groups, appointment) => {
      const area = appointment.client.area;
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(appointment);
      return groups;
    }, {});
  };

  const scheduledAppointments = appointments.filter(
    (apt) => apt.status === 'scheduled'
  );
  const completedAppointments = appointments.filter(
    (apt) => apt.status === 'completed'
  );
  const allVisibleAppointments = [...scheduledAppointments, ...completedAppointments];
  const appointmentsByArea = groupAppointmentsByArea(scheduledAppointments);

  // Calculate estimated work time for scheduled appointments
  const totalEstimatedTime = scheduledAppointments.reduce(
    (sum, appointment) => {
      return sum + (appointment.duration_hours || 1.5);
    },
    0
  );

  const formatDate = (dateString) => {
    // Create date at noon to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York', // Florida timezone
    });
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

  // Handle form submission for scheduling or rescheduling
  const handleScheduleService = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);


    if (!scheduleForm.client || !scheduleForm.date || !scheduleForm.time) {
      createEmailNotification(
        'error',
        'Missing Information',
        'Please select a client, date, and time',
        false
      );
      setIsSubmitting(false);
      return;
    }

    try {
      if (scheduleForm.appointmentId) {
        // Rescheduling existing appointment
        await rescheduleAppointment(
          scheduleForm.appointmentId,
          scheduleForm.date,
          scheduleForm.time
        );
        createEmailNotification(
          'success',
          'Appointment Rescheduled!',
          `${scheduleForm.client.name} rescheduled to ${scheduleForm.date} at ${scheduleForm.time}`,
          true
        );
      } else {
        // New appointment - use database function

        const formData = {
          clientId: scheduleForm.client.id,
          date: scheduleForm.date,
          time: scheduleForm.time,
          duration: scheduleForm.duration,
          serviceType:
            scheduleForm.serviceType ||
            scheduleForm.client.serviceType ||
            scheduleForm.client.service_type,
          notes: scheduleForm.notes,
          recurring: scheduleForm.recurring,
          recurringDay: scheduleForm.recurringDay,
        };


        const result = await createAppointmentsFromForm(formData);

        if (result.success) {
          if (result.type === 'one-time') {
            createEmailNotification(
              'success',
              'Service Scheduled!',
              `${scheduleForm.client.name} scheduled for ${scheduleForm.date} at ${scheduleForm.time}`,
              true
            );
          } else {
            createEmailNotification(
              'success',
              'Recurring Services Scheduled!',
              `${result.appointmentCount} ${result.pattern} appointments created for ${scheduleForm.client.name}`,
              true
            );
          }
        } else {
          throw new Error('Failed to create appointment(s)');
        }
      }

      // Navigate to the scheduled date and refresh appointments
      const scheduledDate = scheduleForm.date;
      if (scheduledDate !== selectedDate) {
        setSelectedDate(scheduledDate);
      }
      await loadAppointmentsForDate(scheduledDate);
      setShowScheduleForm(false);
      // Clear form completely for new appointments
      setScheduleForm({
        appointmentId: null,
        client: null,
        date: selectedDate, // Use current selected date instead of scheduled date
        time: '09:00',
        duration: '1.5',
        serviceType: '',
        area: '',
        notes: '',
        recurring: 'One-time',
        recurringDay: 'Monday',
      });
    } catch (error) {
      console.error('❌ Failed to schedule/reschedule appointment:', error);
      createEmailNotification(
        'error',
        'Error',
        `Failed to save appointment: ${error.message}`,
        false
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reschedule an appointment
  const handleRescheduleAppointment = (appointment) => {
    setScheduleForm({
      appointmentId: appointment.id,
      client: {
        id: appointment.client_id,
        name: appointment.client.name,
        area: appointment.client.area,
        serviceType: appointment.service_type,
      },
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      duration: appointment.duration_hours?.toString() || '1.5',
      serviceType: appointment.service_type,
      area: appointment.client.area,
      notes: appointment.notes || '',
    });
    setShowScheduleForm(true);
  };

  // Handle successful service completion
  const handleServiceCompleted = async (appointment) => {
    try {
      // Update appointment status to completed
      await updateAppointmentStatus(appointment.id, 'completed');
      
      // Refresh appointments to show updated status
      await loadAppointmentsForDate(selectedDate);
      
      // Success notification already handled by MarkServiceComplete component
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      createEmailNotification(
        'error',
        'Status Update Failed',
        'Service added to invoice but failed to update appointment status',
        false
      );
    }
  };

  // Handle service completion errors
  const handleServiceCompletionError = (errorMessage) => {
    createEmailNotification(
      'error',
      'Service Completion Failed',
      errorMessage || 'Failed to complete service',
      false
    );
  };


  // Show delete confirmation modal
  const handleShowDeleteModal = (appointment) => {
    setAppointmentToDelete(appointment);
    setShowDeleteModal(true);
  };

  // Delete single appointment
  const handleDeleteSingleAppointment = async () => {
    if (!appointmentToDelete) return;
    
    try {
      await deleteAppointment(appointmentToDelete.id);
      await loadAppointmentsForDate(selectedDate);
      
      createEmailNotification(
        'success',
        'Appointment Deleted',
        `${appointmentToDelete.client.name} appointment deleted`,
        true
      );
      
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      createEmailNotification(
        'error',
        'Error',
        `Failed to delete appointment: ${error.message}`,
        false
      );
    }
  };

  // Delete all future appointments for client
  const handleDeleteAllFutureAppointments = async () => {
    if (!appointmentToDelete) return;
    
    try {
      const result = await deleteAllFutureAppointments(
        appointmentToDelete.client_id,
        appointmentToDelete.appointment_date
      );
      
      await loadAppointmentsForDate(selectedDate);
      
      createEmailNotification(
        'success',
        'Future Appointments Deleted',
        `Deleted ${result.deletedCount} future appointments for ${appointmentToDelete.client.name}`,
        true
      );
      
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete future appointments:', error);
      createEmailNotification(
        'error',
        'Error',
        `Failed to delete future appointments: ${error.message}`,
        false
      );
    }
  };

  const handleClientChange = (client) => {
    if (client) {
      setScheduleForm({
        ...scheduleForm,
        client: client,
        serviceType: client.serviceType,
        area: client.area,
        duration: '1.5',
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
              <p className="text-gray-600">
                Plan and track your daily service appointments
              </p>
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
                className={`btn btn-sm ${
                  viewMode === 'scheduled' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`btn btn-sm ${
                  viewMode === 'all' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('area')}
                className={`btn btn-sm ${
                  viewMode === 'area' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                By Area
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          {/* Schedule Service Form Modal */}
          {showScheduleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {scheduleForm.appointmentId
                      ? 'Reschedule Service'
                      : 'Schedule New Service'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(false)}
                    className="btn btn-outline px-4 py-2"
                  >
                    ← Back to Schedule
                  </button>
                </div>
                <form onSubmit={handleScheduleService}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Client *</label>
                    <select 
                      value={scheduleForm.client?.id || ''} 
                      onChange={(e) => {
                        const selectedClient = clients.find(c => c.id === parseInt(e.target.value));
                        handleClientChange(selectedClient);
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Service Date
                      </label>
                      <input
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            date: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            time: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Service Type
                      </label>
                      <select
                        value={scheduleForm.serviceType}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            serviceType: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="">Use client default</option>
                        {services.map((service) => (
                          <option key={service.name} value={service.name}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Area
                      </label>
                      <select
                        value={scheduleForm.area}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            area: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="">Use client default</option>
                        {serviceAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Recurring
                      </label>
                      <select
                        value={scheduleForm.recurring}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            recurring: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="One-time">One-time</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    {scheduleForm.recurring !== 'One-time' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Day of Week
                        </label>
                        <select
                          value={scheduleForm.recurringDay}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              recurringDay: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-md"
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Estimated Duration (hours)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="8"
                      value={scheduleForm.duration}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-md"
                      placeholder="1.5"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Notes
                    </label>
                    <textarea
                      value={scheduleForm.notes}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Special instructions, access notes, etc..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      className={`btn btn-primary px-6 ${isSubmitting ? 'btn-loading' : ''}`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : (scheduleForm.appointmentId
                        ? 'Confirm Reschedule'
                        : 'Confirm Appointment')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && appointmentToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" style={{zIndex: 10000}}>
                <h3 className="text-lg font-semibold mb-4 text-red-600" style={{color: 'red !important'}}>
                  Delete Appointment?
                </h3>
                <div className="mb-6">
                  <p className="text-gray-700 mb-2">
                    <strong>Client:</strong> {appointmentToDelete.client.name}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Date:</strong> {formatDate(appointmentToDelete.appointment_date)}
                  </p>
                  <p className="text-gray-700 mb-4">
                    <strong>Time:</strong> {appointmentToDelete.appointment_time}
                  </p>
                  <p className="text-gray-600 text-sm mb-6">
                    Choose your deletion option:
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleDeleteSingleAppointment}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    style={{backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none'}}
                  >
                    Delete This Appointment Only
                  </button>
                  <button
                    onClick={handleDeleteAllFutureAppointments}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    style={{backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none'}}
                  >
                    Delete All Future Appointments for {appointmentToDelete.client.name}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setAppointmentToDelete(null);
                    }}
                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                    style={{backgroundColor: '#d1d5db', color: 'black', padding: '8px 16px', borderRadius: '4px', border: 'none'}}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Date Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const currentDate = new Date(selectedDate + 'T12:00:00');
                  currentDate.setDate(currentDate.getDate() - 1);
                  setSelectedDate(currentDate.toISOString().split('T')[0]);
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
                  {isToday(selectedDate) && (
                    <span className="text-green-600 font-medium"> (Today)</span>
                  )}
                  {isTomorrow(selectedDate) && (
                    <span className="text-blue-600 font-medium">
                      {' '}
                      (Tomorrow)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  const currentDate = new Date(selectedDate + 'T12:00:00');
                  currentDate.setDate(currentDate.getDate() + 1);
                  setSelectedDate(currentDate.toISOString().split('T')[0]);
                }}
                className="btn btn-outline btn-sm"
              >
                Next Day →
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {scheduledAppointments.length} scheduled • {completedAppointments.length} completed
              </p>
              <p className="text-sm text-gray-600">
                Est. {totalEstimatedTime.toFixed(1)} hours remaining
              </p>
            </div>
          </div>

          {/* Main Content Based on View Mode */}
          {viewMode === 'scheduled' && (
            <div>
              <h3 className="font-semibold text-lg mb-4">
                Services for {formatDate(selectedDate)}
              </h3>

              {allVisibleAppointments.length === 0 ? (
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
                  {/* Scheduled Appointments */}
                  {scheduledAppointments.map((appointment) => (
                    <div key={appointment.id} className="card card-hover">
                      <div className="card-content">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-2">
                              <h4 className="font-semibold text-lg">
                                {appointment.client.name}
                              </h4>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {appointment.client.area}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                {appointment.appointment_time}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-1">
                              {appointment.client.address}
                            </p>
                            <div className="flex gap-6 text-sm text-gray-600 mb-2">
                              <span>
                                <strong>Service:</strong>{' '}
                                {appointment.service_type}
                              </span>
                              <span>
                                <strong>Phone:</strong>{' '}
                                {appointment.client.phone}
                              </span>
                              <span>
                                <strong>Duration:</strong>{' '}
                                {appointment.duration_hours}h
                              </span>
                            </div>
                            {appointment.notes && (
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <strong>Notes:</strong> {appointment.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                            <button
                              onClick={() =>
                                handleRescheduleAppointment(appointment)
                              }
                              className="btn btn-outline w-full sm:w-auto min-h-[44px] py-3 px-4 text-base sm:text-lg"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleShowDeleteModal(appointment)}
                              className="btn btn-outline w-full sm:w-auto min-h-[44px] py-3 px-4 text-base sm:text-lg text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                              style={{color: 'red', borderColor: 'red'}}
                            >
                              Delete
                            </button>
                            <MarkServiceComplete
                              appointment={appointment}
                              onComplete={handleServiceCompleted}
                              onError={handleServiceCompletionError}
                              size="default"
                              className="w-full sm:w-auto min-h-[44px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Completed Appointments */}
                  {completedAppointments.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-600 mb-3 flex items-center gap-2">
                        <span className="text-green-600">✓</span> Completed Services
                      </h4>
                      {completedAppointments.map((appointment) => (
                        <div key={appointment.id} className="card card-hover opacity-75 border-l-4 border-l-green-500">
                          <div className="card-content bg-green-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                  <h4 className="font-semibold text-lg text-green-800 line-through decoration-2">
                                    {appointment.client.name}
                                  </h4>
                                  <span className="px-2 py-1 bg-green-200 text-green-900 rounded-full text-xs font-medium">
                                    ✓ COMPLETED
                                  </span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {appointment.client.area}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                                    {appointment.appointment_time}
                                  </span>
                                </div>
                                <p className="text-gray-500 mb-1">
                                  {appointment.client.address}
                                </p>
                                <div className="flex gap-6 text-sm text-gray-500 mb-2">
                                  <span>
                                    <strong>Service:</strong>{' '}
                                    {appointment.service_type}
                                  </span>
                                  <span>
                                    <strong>Phone:</strong>{' '}
                                    {appointment.client.phone}
                                  </span>
                                  <span>
                                    <strong>Duration:</strong>{' '}
                                    {appointment.duration_hours}h
                                  </span>
                                </div>
                                {appointment.notes && (
                                  <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                                    <strong>Notes:</strong> {appointment.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'all' && (
            <div>
              <h3 className="font-semibold text-lg mb-4">
                Week View - {formatDate(selectedDate)} to {formatDate(weekAppointments.length > 0 ? weekAppointments[weekAppointments.length - 1]?.date : selectedDate)}
              </h3>

              {weekAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading week appointments...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {weekAppointments.map((dayData) => (
                    <div key={dayData.date} className="card">
                      <div className="card-header">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-lg">
                            {formatDate(dayData.date)}
                            {isToday(dayData.date) && (
                              <span className="text-green-600 font-medium text-sm ml-2">(Today)</span>
                            )}
                            {isTomorrow(dayData.date) && (
                              <span className="text-blue-600 font-medium text-sm ml-2">(Tomorrow)</span>
                            )}
                          </h4>
                          <span className="text-sm text-gray-600">
                            {dayData.appointments.length} appointment{dayData.appointments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="card-content">
                        {dayData.appointments.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No appointments scheduled</p>
                        ) : (
                          <div className="grid gap-3">
                            {dayData.appointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  setSelectedDate(dayData.date);
                                  setViewMode('scheduled');
                                }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <p className="font-medium">{appointment.client.name}</p>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                      {appointment.client.area}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                      {appointment.appointment_time}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{appointment.client.address}</p>
                                  <p className="text-sm text-gray-600">{appointment.service_type}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{appointment.client.phone}</p>
                                  <p className="text-sm text-gray-600">{appointment.duration_hours}h</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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

              {Object.keys(appointmentsByArea).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No services scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(appointmentsByArea).map(
                    ([area, areaAppointments]) => (
                      <div key={area} className="card">
                        <div className="card-header">
                          <h4 className="font-semibold text-lg flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {area}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({areaAppointments.length} service
                              {areaAppointments.length !== 1 ? 's' : ''})
                            </span>
                          </h4>
                        </div>
                        <div className="card-content">
                          <div className="grid gap-3">
                            {areaAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded"
                              >
                                <div>
                                  <p className="font-medium">
                                    {appointment.client.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {appointment.client.address}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {appointment.service_type}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">
                                    {appointment.client.phone}
                                  </p>
                                  <p className="text-sm font-medium text-green-600">
                                    {appointment.appointment_time}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  )}
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