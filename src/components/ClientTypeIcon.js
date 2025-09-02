import React from 'react';

/**
 * Client Type Icon Component
 * Displays icons for different client types: parent, child, individual
 * Mobile-optimized for Jason's truck-based workflow
 */

/**
 * Get the appropriate icon and label for a client type
 * @param {string} clientType - Client type (parent, child, individual)
 * @param {string} parentName - Parent company name for child properties
 * @returns {Object} Icon and display info
 */
export const getClientTypeDisplay = (clientType, parentName = null) => {
  switch (clientType) {
    case 'parent':
      return {
        icon: '🏢',
        label: 'Parent Company',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Property Management Company'
      };
    case 'child':
      return {
        icon: '🏠',
        label: 'Property',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: parentName ? `Managed by ${parentName}` : 'Property'
      };
    case 'individual':
    default:
      return {
        icon: '👤',
        label: 'Individual Client',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        description: 'Individual Client'
      };
  }
};

/**
 * Client Type Icon Component
 * Shows icon with optional label and parent info
 */
const ClientTypeIcon = ({ 
  clientType = 'individual', 
  parentName = null, 
  childCount = null,
  showLabel = true,
  showParentInfo = true,
  size = 'md'
}) => {
  const display = getClientTypeDisplay(clientType, parentName);
  
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1',
    lg: 'text-lg px-4 py-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${display.bgColor} ${sizeClasses[size]}`}>
      <span className="text-lg" role="img" aria-label={display.label}>
        {display.icon}
      </span>
      
      {showLabel && (
        <div className="flex flex-col min-w-0">
          <span className={`${display.color} font-medium text-sm sm:text-base`}>
            {clientType === 'parent' && childCount !== null 
              ? `${display.label} (${childCount} ${childCount === 1 ? 'property' : 'properties'})`
              : display.label
            }
          </span>
          
          {showParentInfo && clientType === 'child' && parentName && (
            <span className="text-xs text-gray-500 truncate">
              → {parentName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientTypeIcon;