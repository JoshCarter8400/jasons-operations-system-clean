import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  getPendingAmount,
  getTotalRevenue,
  getOverdueAmount 
} from '../data/jasonData';
import { getEquipmentStats, getEquipmentDueForService } from '../utils/database';

function Dashboard() {
  const { businessInfo, clients } = useData();
  const [equipmentStats, setEquipmentStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    needsService: 0,
    conditionBreakdown: {}
  });
  const [equipmentDueForService, setEquipmentDueForService] = useState([]);
  
  const totalClients = clients.length;
  const activeClients = clients.filter(client => client.status === 'Active').length;
  const pendingAmount = getPendingAmount();
  const totalRevenue = getTotalRevenue();
  const overdueAmount = getOverdueAmount();

  useEffect(() => {
    loadEquipmentData();
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
  
  // Calculate jobs this week (clients with next service in the next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const jobsThisWeek = clients.filter(client => {
    if (!client.nextService) return false;
    const nextServiceDate = new Date(client.nextService);
    return nextServiceDate >= today && nextServiceDate <= nextWeek;
  }).length;

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
                <p className="text-2xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
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
                    <span className="font-medium text-yellow-600">${pendingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Collected</span>
                    <span className="font-medium text-green-600">${clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding Balance</span>
                    <span className="font-medium text-yellow-600">${(clients.reduce((sum, client) => sum + (client.totalInvoiced || 0), 0) - clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0)).toFixed(2)}</span>
                  </div>
                  {overdueAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Overdue Amount</span>
                      <span className="font-medium text-red-600">${overdueAmount.toFixed(2)}</span>
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