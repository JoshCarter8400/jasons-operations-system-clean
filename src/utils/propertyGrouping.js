/**
 * Property Grouping Utilities
 * For organizing parent company invoice line items by property location
 */

/**
 * Extracts property name from service description
 * @param {string} description - Service description like "Weekly Mowing (Property Name)"
 * @returns {string} - Property name or null if not found
 */
export const extractPropertyName = (description) => {
  if (!description) return null;
  
  // Look for text in parentheses at the end of the description
  const match = description.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : null;
};

/**
 * Checks if an invoice needs property grouping
 * @param {Object} client - Client object
 * @param {Array} lineItems - Array of invoice line items
 * @returns {boolean} - True if should use property grouping
 */
export const shouldUsePropertyGrouping = (client, lineItems) => {
  // Check if client is a parent company
  if (client && client.client_type === 'parent') {
    return true;
  }
  
  // Check if any line items contain property names (backup detection)
  if (lineItems && lineItems.length > 0) {
    return lineItems.some(item => extractPropertyName(item.description) !== null);
  }
  
  return false;
};

/**
 * Groups invoice line items by property
 * @param {Array} lineItems - Array of invoice line items
 * @returns {Object} - Grouped line items with property subtotals
 */
export const groupLineItemsByProperty = (lineItems) => {
  if (!lineItems || lineItems.length === 0) {
    return {
      groups: {},
      totalAmount: 0
    };
  }

  const groups = {};
  let totalAmount = 0;

  lineItems.forEach(item => {
    const propertyName = extractPropertyName(item.description) || 'Other Services';
    const itemAmount = (item.quantity || 0) * (item.rate || 0);
    
    if (!groups[propertyName]) {
      groups[propertyName] = {
        propertyName,
        items: [],
        subtotal: 0
      };
    }
    
    groups[propertyName].items.push({
      ...item,
      itemAmount
    });
    groups[propertyName].subtotal += itemAmount;
    totalAmount += itemAmount;
  });

  // Sort properties alphabetically for consistent display
  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => {
      // Put "Other Services" at the end
      if (a === 'Other Services') return 1;
      if (b === 'Other Services') return -1;
      return a.localeCompare(b);
    })
    .forEach(key => {
      sortedGroups[key] = groups[key];
    });

  return {
    groups: sortedGroups,
    totalAmount
  };
};

/**
 * Removes property name from service description for display
 * @param {string} description - Full service description
 * @returns {string} - Clean service description without property name
 */
export const cleanServiceDescription = (description) => {
  if (!description) return '';
  
  // Remove property name in parentheses from the end
  return description.replace(/\s*\([^)]+\)$/, '').trim();
};

/**
 * Formats a property group for display
 * @param {Object} group - Property group object
 * @returns {string} - Formatted display string
 */
export const formatPropertyGroupHeader = (propertyName) => {
  return `=== ${propertyName} ===`;
};

/**
 * Checks if a line item belongs to a specific property
 * @param {Object} lineItem - Invoice line item
 * @param {string} propertyName - Property name to check against
 * @returns {boolean} - True if item belongs to property
 */
export const lineItemBelongsToProperty = (lineItem, propertyName) => {
  const itemProperty = extractPropertyName(lineItem.description);
  
  if (propertyName === 'Other Services') {
    return itemProperty === null;
  }
  
  return itemProperty === propertyName;
};

const propertyGroupingUtils = {
  extractPropertyName,
  shouldUsePropertyGrouping,
  groupLineItemsByProperty,
  cleanServiceDescription,
  formatPropertyGroupHeader,
  lineItemBelongsToProperty
};

export default propertyGroupingUtils;