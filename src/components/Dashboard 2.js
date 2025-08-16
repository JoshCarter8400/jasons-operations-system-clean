import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { getEquipmentStats, getEquipmentDueForService } from '../utils/database';
import { getAppointmentsByDate } from '../utils/databaseHelpers';

function Dashboard() {
  const { businessInfo, clients, getAllDatabaseInvoices } = useData();
  const [equipmentStats, setEquipmentStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    needsService: 0,
    conditionBreakdown: {}
  });
  const [equipmentDueForService, setEquipmentDueForService] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState({ 
    monthlyRevenue: 0, 
    pendingAmount: 0, 
    overdueAmount: 0 
  });
  const [jobsThisWeek, setJobsThisWeek] = useState(0);
  
  const totalClients = clients.length;
  const activeClients = clients.filter(client => client.status === 'Active').length;

  useEffect(() => {
    loadEquipmentData();
    loadInvoiceStats();
  }, []);

  useEffect(() => {
    const loadJobsThisWeek = async () => {
      try {
        const today = new Date();
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const mondayOfThisWeek = new Date(today);
        mondayOfThisWeek.setDate(today.getDate() + mondayOffset);
        
        let totalJobs = 0;
        
        // Check each day of this week
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(mondayOfThisWeek);
          checkDate.setDate(mondayOfThisWeek.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          try {
            const dayAppointments = await getAppointmentsByDate(dateStr);
            const scheduledCount = dayAppointments.filter(apt => apt.status === 'scheduled').length;
            totalJobs += scheduledCount;
          } catch (error) {
            console.error(`Failed to load appointments for ${dateStr}:`, error);
          }
        }
        
        setJobsThisWeek(totalJobs);
      } catch (error) {
        console.error('Error loading jobs this week:', error);
        setJobsThisWeek(0);
      }
    };
    
    loadJobsThisWeek();
  }, []);

  const loadEquipmentData = async () => {
    try {
      const [stats, dueForService] = await Promise.all([
        getEquipmentStats(),
        getEquipmentDueForService()
      ]);
      setEquipmentStats(stats);
      setEquipmentDueForService(dueForService);
    } catch (error) {
      console.error('Error loading equipment data:', error);
    }
  };

  const loadInvoiceStats = async () => {
    try {
      const dbInvoices = await getAllDatabaseInvoices();
      
      // Calculate monthly revenue from paid invoices  
      const monthlyRevenue = dbInvoices
        .filter(invoice => invoice.status === 'Paid')
        .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      
      setInvoiceStats({ 
        monthlyRevenue, 
        pendingAmount: 0, 
        overdueAmount: 0 
      });
    } catch (error) {
      console.error('Error loading invoice stats:', error);
      setInvoiceStats({ monthlyRevenue: 0 });
    }
  };
  

  // Calculate clients by area for route efficiency
  const clientsByArea = clients.reduce((acc, client) => {
    acc[client.area] = (acc[client.area] || 0) + 1;
    return acc;
  }, {});
  

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="card-title">{businessInfo.name}</h1>
              <p className="text-gray-600">Dashboard Overview</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>📞 {businessInfo.phone}</p>
              <p>📧 {businessInfo.email}</p>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-content">
                <h3>Total Clients</h3>
                <p className="text-2xl font-bold text-primary">{totalClients}</p>
                <p className="text-sm text-gray-600">{activeClients} active</p>
              </div>
            </div>
            <div className="card">
              <div className="card-content">
                <h3>Active Equipment</h3>
                <p className="text-2xl font-bold text-primary">{equipmentStats.activeEquipment}</p>
                <p className="text-sm text-gray-600">{equipmentStats.totalEquipment} total</p>
              </div>
            </div>
            <div className="card">
              <div className="card-content">
                <h3>Jobs This Week</h3>
                <p className="text-2xl font-bold text-primary">{jobsThisWeek}</p>
                <p className="text-sm text-gray-600">Scheduled services</p>
              </div>
            </div>
            <div className="card">
              <div className="card-content">
                <h3>Monthly Revenue</h3>
                <p className="text-2xl font-bold text-primary">${invoiceStats.monthlyRevenue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total paid</p>
              </div>
            </div>
          </div>
          
          {equipmentStats.needsService > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ Equipment Service Alert</h4>
              <p className="text-red-700">
                {equipmentStats.needsService} piece{equipmentStats.needsService > 1 ? 's' : ''} of equipment need{equipmentStats.needsService === 1 ? 's' : ''} service.
              </p>
              {equipmentDueForService.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium">Equipment due for service:</p>
                  <ul className="list-disc list-inside text-red-600 mt-1">
                    {equipmentDueForService.slice(0, 3).map((equipment) => (
                      <li key={equipment.id}>
                        {equipment.brand} {equipment.model} - {equipment.currentHours - equipment.nextServiceDueHours} hours overdue
                      </li>
                    ))}
                    {equipmentDueForService.length > 3 && (
                      <li>...and {equipmentDueForService.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-content">
                <h3 className="font-semibold mb-4">Service Areas</h3>
                <div className="space-y-2">
                  {Object.entries(clientsByArea).map(([area, count]) => (
                    <div key={area} className="flex justify-between">
                      <span>{area}</span>
                      <span className="font-medium">{count} clients</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="font-semibold mb-4">Equipment Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Equipment</span>
                    <span className="font-medium">{equipmentStats.totalEquipment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Equipment</span>
                    <span className="font-medium text-green-600">{equipmentStats.activeEquipment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Service</span>
                    <span className={`font-medium ${equipmentStats.needsService > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {equipmentStats.needsService}
                    </span>
                  </div>
                  {Object.entries(equipmentStats.conditionBreakdown).map(([condition, count]) => (
                    <div key={condition} className="flex justify-between text-sm">
                      <span className="pl-2">{condition}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <h3 className="font-semibold mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Pending Invoices</span>
                    <span className="font-medium text-yellow-600">${invoiceStats.pendingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Collected</span>
                    <span className="font-medium text-green-600">${clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding Balance</span>
                    <span className="font-medium text-yellow-600">${(clients.reduce((sum, client) => sum + (client.totalInvoiced || 0), 0) - clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0)).toFixed(2)}</span>
                  </div>
                  {invoiceStats.overdueAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Overdue Amount</span>
                      <span className="font-medium text-red-600">${invoiceStats.overdueAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;