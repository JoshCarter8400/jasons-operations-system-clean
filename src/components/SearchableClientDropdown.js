import { useState } from 'react';

function SearchableClientDropdown({ selectedClient, onClientChange, clients, placeholder = "Select a client" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.toLowerCase().replace(/[\s\-()]/g, '').includes(searchTerm.toLowerCase().replace(/[\s\-()]/g, ''))
  );

  const handleSelect = (client) => {
    onClientChange(client);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Auto-open dropdown when typing
    if (value && !isOpen) {
      setIsOpen(true);
    }
    
    // Auto-select if exact match found
    const exactMatch = filteredClients.find(client => 
      client.name.toLowerCase() === value.toLowerCase()
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
          className="w-full p-3 border border-gray-300 rounded-md pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">
                No clients found matching "{searchTerm}"
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                    selectedClient?.id === client.id ? 'bg-blue-50 text-blue-900' : ''
                  }`}
                >
                  <div className="font-medium">{client.name}</div>
                  <div className="text-sm text-gray-600">{client.address}</div>
                  <div className="text-xs text-gray-500">
                    {client.area} • {client.serviceType} • {client.phone}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
}

export default SearchableClientDropdown;