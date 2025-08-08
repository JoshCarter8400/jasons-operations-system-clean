import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import SearchableClientDropdown from './SearchableClientDropdown';
import { createEmailNotification } from '../services/emailService';
import {
  getAppointmentsByDate,
  updateAppointmentStatus,
  rescheduleAppointment,
  initializeAppointmentsTable,
  createAppointmentsFromForm,
} from '../utils/databaseHelpers';

function DailySchedule() {
  const { clients, serviceAreas, services } = useData();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState('scheduled');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [appointments, setAppointments] = useState([]);
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

  useEffect(() => {
    initializeSystem();
  }, []);

  useEffect(() => {
    loadAppointmentsForDate(selectedDate);
  }, [selectedDate]);

  // Initialize the appointment system
  const initializeSystem = async () => {
    try {
      await initializeAppointmentsTable();
      console.log('✅ Appointment system initialized');
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
      console.log(
        `📅 Loaded ${appointmentData.length} appointments for ${date}`
      );
    } catch (error) {
      console.error('❌ Failed to load appointments:', error);
      setAppointments([]);
    }
  };

  // Get upcoming appointments (next 7 days)
  const getUpcomingAppointments = async () => {
    const today = new Date();
    const upcomingAppointments = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const dayAppointments = await getAppointmentsByDate(dateStr);
        upcomingAppointments.push(
          ...dayAppointments.map((apt) => ({ ...apt, date: dateStr }))
        );
      } catch (error) {
        console.error(`Failed to load appointments for ${dateStr}:`, error);
      }
    }

    return upcomingAppointments.sort(
      (a, b) =>
        new Date(a.appointment_date + 'T' + a.appointment_time) -
        new Date(b.appointment_date + 'T' + b.appointment_time)
    );
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

    console.log(
      '🚀 Starting handleScheduleService with form data:',
      scheduleForm
    );

    if (!scheduleForm.client || !scheduleForm.date || !scheduleForm.time) {
      createEmailNotification(
        'error',
        'Missing Information',
        'Please select a client, date, and time',
        false
      );
      return;
    }

    try {
      if (scheduleForm.appointmentId) {
        // Rescheduling existing appointment
        console.log('🔄 Rescheduling appointment:', scheduleForm.appointmentId);
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
        console.log('🆕 Creating new appointment(s)...');

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

        console.log('📝 Form data to submit:', formData);

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
      console.log('🔄 Refreshing appointments and closing form...');
      const scheduledDate = scheduleForm.date;
      if (scheduledDate !== selectedDate) {
        setSelectedDate(scheduledDate);
      }
      await loadAppointmentsForDate(scheduledDate);
      setShowScheduleForm(false);
      setScheduleForm({
        appointmentId: null,
        client: null,
        date: scheduledDate,
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

  // Mark appointment as completed
  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'completed');
      await loadAppointmentsForDate(selectedDate);

      const appointment = appointments.find((apt) => apt.id === appointmentId);
      createEmailNotification(
        'success',
        'Service Completed!',
        `${appointment?.client.name} marked as completed`,
        true
      );
    } catch (error) {
      console.error('Failed to complete appointment:', error);
      createEmailNotification(
        'error',
        'Error',
        'Failed to mark appointment as completed',
        false
      );
    }
  };

  // Skip/cancel an appointment
  const handleSkipAppointment = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'cancelled');
      await loadAppointmentsForDate(selectedDate);

      const appointment = appointments.find((apt) => apt.id === appointmentId);
      createEmailNotification(
        'success',
        'Appointment Cancelled',
        `${appointment?.client.name} appointment cancelled`,
        true
      );
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      createEmailNotification(
        'error',
        'Error',
        'Failed to cancel appointment',
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {scheduleForm.appointmentId
                    ? 'Reschedule Service'
                    : 'Schedule New Service'}
                </h3>
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
                  <div className="flex gap-4">
                    <button type="submit" className="btn btn-primary flex-1">
                      {scheduleForm.appointmentId
                        ? 'Reschedule Service'
                        : 'Schedule Service'}
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
                {scheduledAppointments.length} service
                {scheduledAppointments.length !== 1 ? 's' : ''} scheduled
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

              {scheduledAppointments.length === 0 ? (
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
                  {scheduledAppointments.map((appointment) => (
                    <div key={appointment.id} className="card">
                      <div className="card-content">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
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
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() =>
                                handleRescheduleAppointment(appointment)
                              }
                              className="btn btn-outline btn-sm"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() =>
                                handleSkipAppointment(appointment.id)
                              }
                              className="btn btn-outline btn-sm text-red-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleCompleteAppointment(appointment.id)
                              }
                              className="btn btn-primary btn-sm"
                            >
                              Complete
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