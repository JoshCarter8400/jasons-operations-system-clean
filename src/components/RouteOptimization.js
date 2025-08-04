import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { createEmailNotification } from '../services/emailService';

function RouteOptimization() {
  const { clients } = useData();
  const [currentLocation, setCurrentLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // More realistic time estimates based on service types
  const timePerClient = {
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

  const handleClientToggle = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const optimizeRoute = () => {
    if (!currentLocation.trim()) {
      createEmailNotification(
        'error',
        'Location Required',
        'Please enter your current location to optimize route',
        false
      );
      return;
    }
    
    if (selectedClients.length === 0) {
      createEmailNotification(
        'error',
        'No Clients Selected',
        'Please select at least one client for route optimization',
        false
      );
      return;
    }

    const clientsToVisit = clients.filter(client => selectedClients.includes(client.id));
    
    if (clientsToVisit.length === 0) {
      createEmailNotification(
        'error',
        'Invalid Selection',
        'No valid clients selected for route optimization',
        false
      );
      return;
    }


    // Enhanced optimization algorithm - group by area then optimize within area
    const areaGroups = clientsToVisit.reduce((groups, client) => {
      if (!groups[client.area]) {
        groups[client.area] = [];
      }
      groups[client.area].push(client);
      return groups;
    }, {});

    // Prioritize areas by number of clients (efficiency)
    const sortedAreas = Object.keys(areaGroups).sort((a, b) => 
      areaGroups[b].length - areaGroups[a].length
    );

    // Build optimized route by processing each area
    const optimized = sortedAreas.flatMap(area => {
      const areaClients = areaGroups[area];
      // Within each area, sort by service type and address for consistency
      return areaClients.sort((a, b) => {
        if (a.serviceType !== b.serviceType) {
          return a.serviceType.localeCompare(b.serviceType);
        }
        return a.address.localeCompare(b.address);
      });
    });

    const totalTime = optimized.reduce((sum, client) => {
      return sum + (timePerClient[client.serviceType] || 2.0);
    }, 0);

    // Calculate distances based on area transitions
    let totalDistance = 0;
    optimized.forEach((client, index) => {
      if (index === 0) {
        totalDistance += 8; // Distance from current location to first client
      } else {
        const prevClient = optimized[index - 1];
        if (client.area !== prevClient.area) {
          totalDistance += 15; // Longer distance between areas
        } else {
          totalDistance += 4; // Shorter distance within same area
        }
      }
    });

    const estimatedFuelCost = (totalDistance * 0.15).toFixed(2); // $0.15 per mile
    const efficiency = Math.min(95, Math.max(60, 95 - (sortedAreas.length - 1) * 5));

    setOptimizedRoute({
      clients: optimized,
      totalTime: totalTime.toFixed(1),
      totalDistance: Math.round(totalDistance),
      estimatedFuel: estimatedFuelCost,
      startTime: '8:00 AM',
      efficiency: efficiency,
      areasCount: sortedAreas.length
    });
    
    createEmailNotification(
      'success',
      'Route Optimized!',
      `Generated efficient route for ${optimized.length} clients in ${sortedAreas.length} area${sortedAreas.length !== 1 ? 's' : ''}`,
      true
    );
  };

  const generateDirections = (service = 'google') => {
    if (!optimizedRoute) return;
    
    const origin = encodeURIComponent(currentLocation);
    const waypoints = optimizedRoute.clients.map(client => encodeURIComponent(client.address));
    let mapsUrl;
    
    switch (service) {
      case 'apple':
        // Apple Maps URL scheme
        const appleWaypoints = waypoints.map(wp => `&daddr=${wp}`).join('');
        mapsUrl = `http://maps.apple.com/?saddr=${origin}${appleWaypoints}&dirflg=d`;
        break;
      case 'waze':
        // Waze URL scheme (only supports one destination at a time)
        const firstDestination = waypoints[0];
        mapsUrl = `https://waze.com/ul?q=${firstDestination}&navigate=yes`;
        if (waypoints.length > 1) {
          alert('Waze only supports single destination routing. Opening first location.');
        }
        break;
      case 'google':
      default:
        // Google Maps URL format: /origin/waypoint1/waypoint2/.../destination
        const baseUrl = 'https://www.google.com/maps/dir/';
        mapsUrl = baseUrl + [origin, ...waypoints].join('/');
        break;
    }
    
    // Open in new tab
    window.open(mapsUrl, '_blank');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      optimizeRoute();
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    optimizeRoute();
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      createEmailNotification(
        'error',
        'GPS Not Supported',
        'Geolocation is not supported by this browser. Please enter your address manually.',
        false
      );
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get address (free service)
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.locality && data.principalSubdivision ? 
              `${data.locality}, ${data.principalSubdivision}` : 
              `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setCurrentLocation(address);
            createEmailNotification(
              'success',
              'Location Found!',
              `Current location set to: ${address}`,
              true
            );
          } else {
            // Fallback to coordinates if reverse geocoding fails
            const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setCurrentLocation(coords);
            createEmailNotification(
              'success',
              'GPS Location Set',
              `Using GPS coordinates: ${coords}`,
              true
            );
          }
        } catch (error) {
          console.error('Error getting location:', error);
          const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
          setCurrentLocation(coords);
          createEmailNotification(
            'warning',
            'Location Set',
            `Using GPS coordinates: ${coords}`,
            true
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = 'Unable to retrieve your location. Please enter your address manually.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enter your address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please enter your address manually.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please enter your address manually.';
            break;
          default:
            errorMessage = 'Unable to retrieve your location. Please enter your address manually.';
            break;
        }
        createEmailNotification(
          'error',
          'GPS Failed',
          errorMessage,
          false
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Route Optimization</h1>
          <p className="text-gray-600">Plan the most efficient route for your service calls</p>
        </div>
        <div className="card-content">
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Your Current Location *</label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter any address (street, city, state) or business name"
                  className="w-full p-4 text-lg border border-gray-300 rounded-md touch-manipulation"
                  style={{ fontSize: '16px' }} // Prevents zoom on iOS
                  list="location-suggestions"
                />
                <datalist id="location-suggestions">
                  <option value="Sarasota, FL" />
                  <option value="Bradenton, FL" />
                  <option value="Venice, FL" />
                  <option value="Lakewood Ranch, FL" />
                  <option value="Siesta Key, FL" />
                  <option value="Anna Maria Island, FL" />
                  <option value="Osprey, FL" />
                  <option value="Nokomis, FL" />
                  <option value="Palmetto, FL" />
                  <option value="Ellenton, FL" />
                </datalist>
                <button 
                  type="button" 
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="btn btn-outline btn-sm mt-2 w-full sm:w-auto"
                >
                  {locationLoading ? '📍 Getting Location...' : '📍 Use Current GPS Location'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-4 text-lg border border-gray-300 rounded-md touch-manipulation"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
          </form>

          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">Select Clients to Visit</h3>
            <div className="space-y-3">
              {clients.map((client) => (
                <label 
                  key={client.id} 
                  className="block cursor-pointer border border-gray-200 rounded-lg p-4 hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                      className="mt-1 w-5 h-5 touch-manipulation"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                        <h4 className="font-medium text-lg">{client.name}</h4>
                        <span className="text-sm text-gray-600 mt-1 sm:mt-0">
                          ~{timePerClient[client.serviceType] || 2.0}h
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 break-words">{client.address}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm text-gray-600">
                        <span><strong>Service:</strong> {client.serviceType}</span>
                        <span><strong>Area:</strong> {client.area}</span>
                        <span><strong>Phone:</strong> {client.phone}</span>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <button 
              onClick={optimizeRoute}
              className="btn btn-primary w-full text-lg py-4 touch-manipulation"
              disabled={!currentLocation || selectedClients.length === 0}
            >
              🗺️ Optimize Route ({selectedClients.length} clients)
            </button>
          </div>

          {optimizedRoute && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
                <h3 className="font-semibold text-lg text-green-800">Optimized Route Plan</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => generateDirections('google')} 
                    className="btn btn-secondary text-lg py-3 touch-manipulation"
                  >
                    🗺️ Open in Google Maps
                  </button>
                  <button 
                    onClick={() => generateDirections('apple')} 
                    className="btn btn-outline text-lg py-3 touch-manipulation"
                  >
                    🍎 Open in Apple Maps
                  </button>
                  <button 
                    onClick={() => generateDirections('waze')} 
                    className="btn btn-outline text-lg py-3 touch-manipulation"
                  >
                    🚗 Open in Waze
                  </button>
                </div>
              </div>
              
              {/* Embedded Google Maps */}
              <div className="mb-6">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO86_S9C4GFkXw&origin=${encodeURIComponent(currentLocation)}&destination=${encodeURIComponent(optimizedRoute.clients[optimizedRoute.clients.length - 1].address)}&waypoints=${optimizedRoute.clients.slice(0, -1).map(client => encodeURIComponent(client.address)).join('|')}&mode=driving`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Optimized Route Map"
                  />
                  <div className="p-3 bg-gray-100 text-sm text-gray-600 text-center">
                    Interactive route map showing optimized path through all selected locations
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                <div className="text-center bg-white rounded-lg p-3">
                  <div className="text-xl sm:text-2xl font-bold text-green-700">{optimizedRoute.clients.length}</div>
                  <div className="text-xs sm:text-sm text-green-600">Stops</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3">
                  <div className="text-xl sm:text-2xl font-bold text-green-700">{optimizedRoute.totalTime}h</div>
                  <div className="text-xs sm:text-sm text-green-600">Total Time</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3">
                  <div className="text-xl sm:text-2xl font-bold text-green-700">{optimizedRoute.totalDistance}mi</div>
                  <div className="text-xs sm:text-sm text-green-600">Distance</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3">
                  <div className="text-xl sm:text-2xl font-bold text-green-700">${optimizedRoute.estimatedFuel}</div>
                  <div className="text-xs sm:text-sm text-green-600">Fuel Cost</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl font-bold text-green-700">{optimizedRoute.efficiency}%</div>
                  <div className="text-xs sm:text-sm text-green-600">Efficiency</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4 text-lg">Route Order (Starting at {optimizedRoute.startTime}):</h4>
                <div className="space-y-3">
                  {optimizedRoute.clients.map((client, index) => {
                    // Calculate cumulative time up to this client
                    let cumulativeTime = 0;
                    for (let i = 0; i < index; i++) {
                      const prevClient = optimizedRoute.clients[i];
                      cumulativeTime += timePerClient[prevClient.serviceType] || 2.0;
                      cumulativeTime += 0.25; // Add 15 minutes travel time between clients
                    }
                    
                    const startTime = new Date(`2024-01-01 ${optimizedRoute.startTime}`);
                    startTime.setMinutes(startTime.getMinutes() + (cumulativeTime * 60));
                    const timeString = startTime.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit', 
                      hour12: true 
                    });

                    return (
                      <div key={client.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-lg mb-1">{client.name}</h5>
                              <p className="text-sm text-gray-600 mb-1 break-words">{client.address}</p>
                              <p className="text-sm text-gray-600">{client.serviceType} • ~{timePerClient[client.serviceType] || 2.0}h</p>
                            </div>
                            <div className="text-right mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                              <div className="text-lg font-medium text-green-700">{timeString}</div>
                              <div className="text-xs text-gray-600">Est. arrival</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RouteOptimization;