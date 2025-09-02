import React, { useState, useEffect } from 'react';
import { getChildPropertiesForParent } from '../utils/databaseHelpers';
import ClientTypeIcon from './ClientTypeIcon';

/**
 * Parent Company Details Component
 * Shows expandable list of child properties for a parent company
 * Mobile-optimized for Jason's workflow
 */
const ParentCompanyDetails = ({ parentClient, isExpanded, onToggleExpanded }) => {
  const [childProperties, setChildProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChildProperties = async () => {
      if (!isExpanded || !parentClient || parentClient.client_type !== 'parent') return;

      setLoading(true);
      setError('');

      try {
        const children = await getChildPropertiesForParent(parentClient.id);
        setChildProperties(children);
      } catch (error) {
        console.error('Failed to load child properties:', error);
        setError('Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    loadChildProperties();
  }, [isExpanded, parentClient]);

  const handleToggle = () => {
    onToggleExpanded(!isExpanded);
  };

  if (parentClient.client_type !== 'parent') {
    return null;
  }

  return (
    <div className="mt-4 border-t pt-4">
      {/* Expandable Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🏠</span>
          <div className="text-left">
            <h4 className="font-medium text-blue-800">
              Child Properties ({childProperties.length || '...'})</h4>
            <p className="text-sm text-blue-600">Click to view property details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-sm text-blue-600">Loading...</span>}
          <span className={`text-2xl transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶️
          </span>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-3 bg-white border border-gray-200 rounded-lg">
          {loading ? (
            <div className="p-4 text-center text-gray-600">
              Loading properties...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">
              {error}
            </div>
          ) : childProperties.length === 0 ? (
            <div className="p-4 text-center text-gray-600">
              <p>No child properties found.</p>
              <p className="text-sm mt-1">This parent company can be converted back to an individual client.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {childProperties.map((child, index) => (
                <div key={child.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <ClientTypeIcon 
                      clientType="child"
                      showLabel={false}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 mb-1">{child.name}</h5>
                      <p className="text-sm text-gray-600 mb-1">{child.address}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span><strong>Service:</strong> {child.service_type}</span>
                        <span><strong>Price:</strong> {child.price}</span>
                        <span><strong>Area:</strong> {child.area}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        child.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {child.status}
                      </span>
                      {child.phone && (
                        <a 
                          href={`tel:${child.phone}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          📞 Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Footer */}
          {!loading && !error && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Total Properties: <strong>{childProperties.length}</strong>
                </span>
                <span className="text-gray-600">
                  Monthly Revenue: <strong>
                    ${childProperties.reduce((total, child) => {
                      const price = parseFloat(child.price.replace(/[$,]/g, '')) || 0;
                      return total + price;
                    }, 0).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentCompanyDetails;