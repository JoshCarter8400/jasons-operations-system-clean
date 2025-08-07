import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import SearchableClientDropdown from './SearchableClientDropdown';
import { createEmailNotification } from '../services/emailService';
import { getDatabaseClients, updateClientNextService, updateClientRecurringSchedule } from '../utils/databaseHelpers';

function DailySchedule() {
  const { clients, updateClient, scheduleService, serviceAreas, services } = useData();
  
  // Fix date display - today should show August 2, 2025
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('scheduled'); // 'scheduled', 'all', 'area', 'schedule'
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [dbClients, setDbClients] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    client: null,
    date: selectedDate,
    time: '09:00',
    duration: '1.5',
    serviceType: '',
    area: '',
    notes: ''
  });

  useEffect(() => {
    testDatabase(); // Load clients from database when component starts
  }, []);
  
  // Get clients scheduled for the selected date
  const getScheduledClients = (date) => {
    return dbClients.filter(client => {
      // Check both nextService and next_service_date fields
      const nextServiceDate = client.nextService || client.next_service_date;
      if (!nextServiceDate) return false;
      
      // Convert MM/DD/YYYY to YYYY-MM-DD format for comparison
      if (nextServiceDate.includes('/')) {
        const [month, day, year] = nextServiceDate.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return formattedDate === date;
      }
      
      return nextServiceDate === date;
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

  const testDatabase = async () => {
    console.log('🧪 Testing database connection from UI...');
    try {
      const clients = await getDatabaseClients();
      setDbClients(clients);
      console.log('✅ Database test successful:', clients.length, 'clients loaded');
      console.log('📋 First few clients:', clients.slice(0, 3));
      
      // Check for Irina specifically
      const irina = clients.find(c => c.name.includes('Irina'));
      if (irina) {
        console.log('👑 Irina Realtor data:', irina);
      }
    } catch (error) {
      console.error('❌ Database test failed:', error);
    }
  };

  const generateRecurringAppointments = (startDate, weeksAhead = 1) => {
    console.log('🔄 Generating recurring appointments...');
    
    // Find clients with active recurring schedules
    const recurringClients = dbClients.filter(client => 
      client.recurring_frequency && 
      client.recurring_frequency !== 'manual' && 
      client.recurring_active
    );
    
    console.log(`Found ${recurringClients.length} clients with recurring schedules`);
    
    // For now, just log what would be generated (don't save to DB yet)
    recurringClients.forEach(client => {
      console.log(`${client.name}: ${client.recurring_frequency} on ${client.recurring_day} at ${client.recurring_time}`);
    });
    
    return recurringClients;
  };


  // Helper function for better client name matching
  const findClientByName = (clients, searchName) => {
    console.log(`🔍 Looking for: "${searchName}"`);
    
    // Try exact match first
    let client = clients.find(c => c.name === searchName);
    if (client) {
      console.log(`✅ Found exact match: "${client.name}"`);
      return client;
    }
    
    // Try case-insensitive exact match
    client = clients.find(c => c.name.toLowerCase() === searchName.toLowerCase());
    if (client) {
      console.log(`✅ Found case-insensitive match: "${client.name}"`);
      return client;
    }
    
    // Try partial match - client name contains search name
    client = clients.find(c => c.name.toLowerCase().includes(searchName.toLowerCase()));
    if (client) {
      console.log(`✅ Found partial match: "${client.name}" contains "${searchName}"`);
      return client;
    }
    
    // Try reverse partial match - search name contains client name
    client = clients.find(c => searchName.toLowerCase().includes(c.name.toLowerCase()));
    if (client) {
      console.log(`✅ Found reverse partial match: "${searchName}" contains "${client.name}"`);
      return client;
    }
    
    // Try first word matching
    const searchFirstWord = searchName.split(' ')[0].toLowerCase();
    client = clients.find(c => {
      const clientFirstWord = c.name.split(' ')[0].toLowerCase();
      return clientFirstWord === searchFirstWord;
    });
    if (client) {
      console.log(`✅ Found first word match: "${client.name}" (${client.name.split(' ')[0]} = ${searchName.split(' ')[0]})`);
      return client;
    }
    
    console.log(`❌ NOT FOUND: "${searchName}"`);
    return null;
  };

  const importJasonsCompleteSchedule = async () => {
    console.log('📅 Importing Jason\'s complete weekly schedule...');
    console.log(`📊 Total clients in database: ${dbClients.length}`);
    
    // Debug: Show first few client names in database
    console.log('📋 Sample client names in database:', dbClients.slice(0, 10).map(c => c.name));
    
    // Monday grass clients (weekly and bi-weekly)
    const mondayClients = [
      'Irina Realtor', 'Mike', 'Christian and Mary', 'Ericka and Eugene', 'Jane', 
      'Jordan', 'llona grass', 'Mela', 'Issac', 'Jason', 'Kathie Gorden', 'Julie', 
      'Shay', 'Kelly', 'Ann', 'Nikie', 'Erin', 'Celeste', 'Jessa'
    ];
    
    // Tuesday grass clients  
    const tuesdayClients = [
      'Suzanne', 'Kaitlin', 'Sam', 'Daniel Tinker', 'Maria', 'Saly', 
      'seascape properties (Hannah)', 'llona', 'Keely', 'Tommy Bahama (Wendy)', 
      'Cheesecake Factory Flower Child'
    ];
    
    // 3rd Wednesday monthly maintenance
    const wednesdayMonthly = ['Tom and Ricky', 'Cathy Thompson', 'Vince', 'Ronald', 'Cindy'];
    
    // 3rd Thursday monthly maintenance  
    const thursdayMonthly = ['Melvin', 'Carla', 'Betty Jo'];
    
    let updated = 0;
    const updatedClients = [...dbClients];
    const updatePromises = [];
    const notFound = [];
    
    console.log('\n🗓️ Processing Monday clients...');
    // Set up Monday clients
    mondayClients.forEach(clientName => {
      const client = findClientByName(updatedClients, clientName);
      if (client) {
        const clientIndex = updatedClients.findIndex(c => c.id === client.id);
        const isWeekly = client.service_type?.includes('weekly') || client.services?.includes('weekly');
        const recurringData = {
          recurring_frequency: isWeekly ? 'weekly' : 'bi-weekly',
          recurring_day: 'Monday',
          recurring_time: '9:00 AM',
          recurring_active: true
        };
        
        updatedClients[clientIndex] = {
          ...client,
          ...recurringData
        };
        
        // Queue database update
        updatePromises.push(updateClientRecurringSchedule(client.id, recurringData));
        updated++;
        console.log(`✅ ${client.name}: ${recurringData.recurring_frequency} Monday`);
      } else {
        notFound.push(`Monday: ${clientName}`);
      }
    });
    
    console.log('\n🗓️ Processing Tuesday clients...');
    // Set up Tuesday clients
    tuesdayClients.forEach(clientName => {
      const client = findClientByName(updatedClients, clientName);
      if (client) {
        const clientIndex = updatedClients.findIndex(c => c.id === client.id);
        const isWeekly = client.service_type?.includes('weekly') || client.services?.includes('weekly');
        const recurringData = {
          recurring_frequency: isWeekly ? 'weekly' : 'bi-weekly',
          recurring_day: 'Tuesday',
          recurring_time: '9:00 AM',
          recurring_active: true
        };
        
        updatedClients[clientIndex] = {
          ...client,
          ...recurringData
        };
        
        // Queue database update
        updatePromises.push(updateClientRecurringSchedule(client.id, recurringData));
        updated++;
        console.log(`✅ ${client.name}: ${recurringData.recurring_frequency} Tuesday`);
      } else {
        notFound.push(`Tuesday: ${clientName}`);
      }
    });
    
    console.log('\n🗓️ Processing monthly maintenance clients...');
    // Set up monthly maintenance clients
    [...wednesdayMonthly, ...thursdayMonthly].forEach(clientName => {
      const client = findClientByName(updatedClients, clientName);
      if (client) {
        const clientIndex = updatedClients.findIndex(c => c.id === client.id);
        const recurringDay = wednesdayMonthly.includes(clientName) ? 'Wednesday' : 'Thursday';
        const recurringData = {
          recurring_frequency: 'monthly',
          recurring_day: recurringDay,
          recurring_time: '9:00 AM',
          recurring_active: true
        };
        
        updatedClients[clientIndex] = {
          ...client,
          ...recurringData
        };
        
        // Queue database update
        updatePromises.push(updateClientRecurringSchedule(client.id, recurringData));
        updated++;
        console.log(`✅ ${client.name}: monthly ${recurringDay}`);
      } else {
        notFound.push(`${wednesdayMonthly.includes(clientName) ? 'Wednesday' : 'Thursday'}: ${clientName}`);
      }
    });
    
    // Show summary of what wasn't found
    if (notFound.length > 0) {
      console.log('\n❌ Clients not found:');
      notFound.forEach(item => console.log(`   - ${item}`));
    }
    
    console.log(`\n📊 Summary: Found ${updated} clients, ${notFound.length} not found`);
    
    // Execute all database updates
    try {
      console.log(`⏳ Saving ${updatePromises.length} recurring schedules to database...`);
      const results = await Promise.all(updatePromises);
      const successful = results.filter(result => result.success).length;
      
      // Update the state with modified clients
      setDbClients(updatedClients);
      console.log(`🎉 Import complete! Updated ${updated} clients with recurring schedules`);
      console.log(`💾 Successfully saved ${successful} recurring schedules to database`);
      
      // Show success notification
      createEmailNotification(
        'success',
        'Schedule Import Complete!',
        `Updated ${updated} clients with recurring schedules (${successful} saved to database)`,
        true
      );
    } catch (error) {
      console.error('❌ Error saving recurring schedules to database:', error);
      createEmailNotification(
        'error',
        'Database Error',
        'Failed to save some recurring schedules to database. Check console for details.',
        false
      );
    }
  };

  const generateMonthlyAppointments = async () => {
    console.log('📅 Generating monthly maintenance appointments for next 6 months...');
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Function to calculate 3rd Wednesday or Thursday of any month
    const getThirdWeekDay = (year, month, dayOfWeek) => {
      const firstDay = new Date(year, month, 1);
      const firstWeekday = firstDay.getDay();
      const offset = (dayOfWeek - firstWeekday + 7) % 7;
      return new Date(year, month, 1 + offset + 14); // +14 for third occurrence
    };
    
    let totalGenerated = 0;
    const allUpdatePromises = [];
    
    // Get monthly clients only
    const monthlyClients = dbClients.filter(client => 
      client.recurring_active && 
      client.recurring_frequency === 'monthly' && 
      client.recurring_day
    );
    
    console.log(`🔍 Found ${monthlyClients.length} monthly maintenance clients`);
    
    monthlyClients.forEach(client => {
      console.log(`🔎 Processing monthly client: ${client.name} (${client.recurring_day})`);
      
      const appointments = [];
      
      // Generate 6 months of appointments
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const targetMonth = currentMonth + monthOffset;
        const targetYear = currentYear + Math.floor(targetMonth / 12);
        const adjustedMonth = targetMonth % 12;
        
        let appointmentDate = null;
        
        if (client.recurring_day === 'Wednesday') {
          appointmentDate = getThirdWeekDay(targetYear, adjustedMonth, 3); // Wednesday = 3
        } else if (client.recurring_day === 'Thursday') {
          appointmentDate = getThirdWeekDay(targetYear, adjustedMonth, 4); // Thursday = 4
        }
        
        if (appointmentDate) {
          const dateStr = appointmentDate.toISOString().split('T')[0];
          appointments.push(dateStr);
          console.log(`  ✅ Monthly: ${client.name} scheduled for 3rd ${client.recurring_day} ${dateStr}`);
        }
      }
      
      // For now, just set the next service to the first appointment
      // In a full implementation, you'd save all appointments to a separate appointments table
      if (appointments.length > 0) {
        const nextServiceDate = appointments[0];
        
        // Update local state
        const originalClientIndex = dbClients.findIndex(c => c.id === client.id);
        if (originalClientIndex !== -1) {
          const updatedDbClients = [...dbClients];
          updatedDbClients[originalClientIndex] = {
            ...dbClients[originalClientIndex],
            nextService: nextServiceDate
          };
          setDbClients(updatedDbClients);
        }
        
        // Queue database update for the next service date
        allUpdatePromises.push(updateClientNextService(client.id, nextServiceDate));
        totalGenerated += appointments.length;
        
        console.log(`📝 Generated ${appointments.length} monthly appointments for ${client.name}, next service: ${nextServiceDate}`);
      }
    });
    
    // Execute all database updates
    try {
      console.log(`⏳ Saving ${allUpdatePromises.length} next service dates to database...`);
      const results = await Promise.all(allUpdatePromises);
      const successful = results.filter(result => result.success).length;
      console.log(`🚀 Generated ${totalGenerated} total monthly appointments!`);
      console.log(`💾 Successfully saved ${successful} next service dates to database`);
      
      // Refresh the UI
      const refreshedClients = await getDatabaseClients();
      setDbClients(refreshedClients);
      
      // Show success notification
      createEmailNotification(
        'success',
        'Monthly Appointments Generated!',
        `Generated ${totalGenerated} monthly appointments for next 6 months (${successful} clients updated)`,
        true
      );
    } catch (error) {
      console.error('❌ Error saving monthly appointments to database:', error);
      createEmailNotification(
        'error',
        'Database Error',
        'Failed to save monthly appointments to database.',
        false
      );
    }
  };

  const generateWeekAppointments = async () => {
    console.log('📅 Generating recurring appointments for next 4-8 weeks...');
    
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the upcoming Monday (this week if it hasn't passed, next week if it has)
    let daysUntilMonday;
    if (currentDayOfWeek === 0) { // Sunday
      daysUntilMonday = 1; // Monday is tomorrow
    } else if (currentDayOfWeek === 1) { // Monday  
      daysUntilMonday = 0; // Today is Monday, but we want next Monday for recurring schedules
    } else { // Tuesday through Saturday
      daysUntilMonday = 7 - currentDayOfWeek + 1; // Days to next Monday
    }
    
    // If today is Monday, we want the next Monday (7 days away) for scheduling purposes
    if (currentDayOfWeek === 1) {
      daysUntilMonday = 7;
    }
    
    const startMonday = new Date(today);
    startMonday.setDate(today.getDate() + daysUntilMonday - 1); // Subtract 1 to fix the off-by-one
    
    console.log(`📅 Starting from Monday: ${startMonday.toDateString()}`);
    
    let totalGenerated = 0;
    const allUpdatePromises = [];
    
    // Filter to get only weekly/bi-weekly recurring clients (exclude monthly)
    const recurringClients = dbClients.filter(client => 
      client.recurring_active && 
      client.recurring_frequency !== 'manual' && 
      client.recurring_frequency !== 'monthly' &&
      client.recurring_day
    );
    
    console.log(`🔍 Found ${recurringClients.length} weekly/bi-weekly recurring clients to process`);
    
    // Generate multiple weeks of appointments for each client
    recurringClients.forEach(client => {
      console.log(`🔎 Processing client: ${client.name} (${client.recurring_frequency})`);
      
      const appointments = [];
      
      if (client.recurring_frequency === 'weekly') {
        // Generate 6 weeks of weekly appointments
        for (let week = 0; week < 6; week++) {
          const appointmentDate = new Date(startMonday);
          
          // Add days for the correct day of week
          if (client.recurring_day === 'Monday') {
            appointmentDate.setDate(startMonday.getDate() + (week * 7));
          } else if (client.recurring_day === 'Tuesday') {
            appointmentDate.setDate(startMonday.getDate() + 1 + (week * 7));
          }
          
          const dateStr = appointmentDate.toISOString().split('T')[0];
          appointments.push(dateStr);
          console.log(`  ✅ Weekly: ${client.name} scheduled for ${client.recurring_day} ${dateStr}`);
        }
      } else if (client.recurring_frequency === 'bi-weekly') {
        // Generate 8 weeks worth (4 bi-weekly appointments)
        for (let biWeek = 0; biWeek < 4; biWeek++) {
          const appointmentDate = new Date(startMonday);
          
          // Add days for the correct day of week, every other week
          if (client.recurring_day === 'Monday') {
            appointmentDate.setDate(startMonday.getDate() + (biWeek * 14));
          } else if (client.recurring_day === 'Tuesday') {
            appointmentDate.setDate(startMonday.getDate() + 1 + (biWeek * 14));
          }
          
          const dateStr = appointmentDate.toISOString().split('T')[0];
          appointments.push(dateStr);
          console.log(`  ✅ Bi-weekly: ${client.name} scheduled for ${client.recurring_day} ${dateStr}`);
        }
      }
      
      // For now, just set the next service to the first appointment
      // In a full implementation, you'd save all appointments to a separate appointments table
      if (appointments.length > 0) {
        const nextServiceDate = appointments[0];
        
        // Find and update the original client in dbClients array
        const originalClientIndex = dbClients.findIndex(c => c.id === client.id);
        if (originalClientIndex !== -1) {
          const updatedDbClients = [...dbClients];
          updatedDbClients[originalClientIndex] = {
            ...dbClients[originalClientIndex],
            nextService: nextServiceDate
          };
          setDbClients(updatedDbClients);
        }
        
        // Queue database update for the next service date
        allUpdatePromises.push(updateClientNextService(client.id, nextServiceDate));
        totalGenerated += appointments.length;
        
        console.log(`📝 Generated ${appointments.length} appointments for ${client.name}, next service: ${nextServiceDate}`);
      }
    });
    
    // Execute all database updates
    try {
      console.log(`⏳ Saving ${allUpdatePromises.length} next service dates to database...`);
      const results = await Promise.all(allUpdatePromises);
      const successful = results.filter(result => result.success).length;
      console.log(`🚀 Generated ${totalGenerated} total appointments!`);
      console.log(`💾 Successfully saved ${successful} next service dates to database`);
      
      // Refresh the UI with fresh data from database
      const refreshedClients = await getDatabaseClients();
      setDbClients(refreshedClients);
      
      // Force UI refresh by updating selectedDate to next Monday
      const nextMonday = new Date(startMonday);
      const mondayStr = nextMonday.toISOString().split('T')[0];
      setSelectedDate(mondayStr);
      
      console.log(`🔄 UI refreshed with ${refreshedClients.length} clients, switched to Monday ${mondayStr}`);
      
      // Show success notification
      createEmailNotification(
        'success',
        'Recurring Appointments Generated!',
        `Generated ${totalGenerated} total appointments (${successful} clients updated). Switched to Monday view.`,
        true
      );
    } catch (error) {
      console.error('❌ Error saving appointments to database:', error);
      createEmailNotification(
        'error',
        'Database Error',
        'Failed to save some appointments to database. Check console for details.',
        false
      );
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
                onClick={testDatabase}
                className="btn btn-secondary btn-sm"
              >
                Test Database ({dbClients.length} loaded)
              </button>
              <button
                onClick={() => generateRecurringAppointments(selectedDate)}
                className="btn btn-secondary btn-sm"
              >
                Test Recurring
              </button>
              <button
                onClick={importJasonsCompleteSchedule}
                className="btn btn-secondary btn-sm"
              >
                Import Complete Schedule
              </button>
              <button
                onClick={generateWeekAppointments}
                className="btn btn-secondary btn-sm"
              >
                Generate Recurring (4-8 weeks)
              </button>
              <button
                onClick={generateMonthlyAppointments}
                className="btn btn-secondary btn-sm"
              >
                Generate Monthly (6 months)
              </button>
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