import React from 'react';
import { 
  businessInfo,
  clients, 
  getPendingAmount,
  getTotalRevenue,
  getOverdueAmount 
} from '../data/jasonData';

function Dashboard() {
  const totalClients = clients.length;
  const activeClients = clients.filter(client => client.status === 'Active').length;
  const pendingAmount = getPendingAmount();
  const totalRevenue = getTotalRevenue();
  const overdueAmount = getOverdueAmount();
  
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
                <h3>Pending Invoices</h3>
                <p className="text-2xl font-bold text-secondary">${pendingAmount.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{overdueAmount > 0 ? `$${overdueAmount.toFixed(2)} overdue` : 'All current'}</p>
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
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <h3 className="font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Invoiced</span>
                    <span className="font-medium">${clients.reduce((sum, client) => sum + (client.totalInvoiced || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Collected</span>
                    <span className="font-medium">${clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding Balance</span>
                    <span className="font-medium text-yellow-600">${(clients.reduce((sum, client) => sum + (client.totalInvoiced || 0), 0) - clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0)).toFixed(2)}</span>
                  </div>
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