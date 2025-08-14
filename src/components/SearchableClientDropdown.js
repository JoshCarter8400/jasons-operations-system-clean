import { useState, useEffect } from 'react';

function SearchableClientDropdown({
  selectedClient,
  onClientChange,
  clients,
  placeholder = 'Select a client',
  clearOnReset = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Clear search term when selectedClient changes to null and clearOnReset is true
  useEffect(() => {
    if (clearOnReset && !selectedClient) {
      setSearchTerm('');
    }
  }, [selectedClient, clearOnReset]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown elements
      const isClickInsideDropdown = event.target.closest('[data-dropdown]') || 
                                   event.target.closest('input') ||
                                   event.target.closest('button');
      
      if (isOpen && !isClickInsideDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Ensure clients is an array and has data
  const clientList = Array.isArray(clients) ? clients : [];

  const filteredClients = clientList.filter((client) => {
    if (!client) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (client.name && client.name.toLowerCase().includes(searchLower)) ||
      (client.address && client.address.toLowerCase().includes(searchLower)) ||
      (client.area && client.area.toLowerCase().includes(searchLower)) ||
      (client.phone &&
        client.phone
          .toLowerCase()
          .replace(/[\s\-()]/g, '')
          .includes(searchLower.replace(/[\s\-()]/g, '')))
    );
  });

  const handleSelect = (client) => {
    onClientChange(client);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear selected client when user starts typing if there was a selection
    if (selectedClient && value !== selectedClient.name) {
      onClientChange(null);
    }

    // Auto-open dropdown when typing
    if (value && !isOpen) {
      setIsOpen(true);
    }

    // Auto-select if exact match found
    const exactMatch = filteredClients.find(
      (client) => client.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch && exactMatch !== selectedClient) {
      onClientChange(exactMatch);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredClients.length === 1) {
      e.preventDefault();
      handleSelect(filteredClients[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">Client *</label>
      <div className="relative">
        <input
          type="text"
          value={selectedClient ? selectedClient.name : searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-md pr-10 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-200"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:text-gray-600 p-1"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            data-dropdown
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
            tabIndex={-1}
          >
            {clientList.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">
                No clients available. Please add clients first.
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">
                {searchTerm
                  ? `No clients found matching "${searchTerm}"`
                  : 'Start typing to search clients...'}
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                    selectedClient?.id === client.id
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:text-blue-700'
                  }`}
                >
                  <div className="font-medium">
                    {client.name || 'Unknown Client'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {client.address || 'No address'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {client.area || 'Unknown area'} •{' '}
                    {client.serviceType ||
                      client.service_type ||
                      'Unknown service'}{' '}
                    • {client.phone || 'No phone'}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default SearchableClientDropdown;
