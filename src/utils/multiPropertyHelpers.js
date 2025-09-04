/**
 * Multi-Property Invoice Helper Functions
 * 
 * Utility functions for handling multi-property invoices where service descriptions
 * contain property names in parentheses (e.g., "Mowing (Main House)")
 */

/**
 * Determines if an invoice contains multi-property services
 * @param {Array} lineItems - Array of invoice line items
 * @returns {boolean} - True if any line item contains a property designation in parentheses
 */
const isMultiPropertyInvoice = (lineItems) => {
  return lineItems.some(item => {
    const description = item.description || '';
    return description.includes('(') && description.includes(')');
  });
};

/**
 * Extracts the property name from a service description
 * @param {string} description - Service description that may contain property name in parentheses
 * @returns {string|null} - The property name if found, null otherwise
 * @example
 * extractPropertyName("Mowing (Main House)") // returns "Main House"
 * extractPropertyName("Tree Trimming") // returns null
 */
const extractPropertyName = (description) => {
  const match = description.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
};

/**
 * Removes the property name designation from a service description
 * @param {string} description - Service description with property name in parentheses
 * @returns {string} - Clean service description without the property designation
 * @example
 * cleanServiceDescription("Mowing (Main House)") // returns "Mowing"
 * cleanServiceDescription("Tree Trimming") // returns "Tree Trimming"
 */
const cleanServiceDescription = (description) => {
  return description.replace(/\s*\([^)]+\)\s*$/, '').trim();
};

/**
 * Groups invoice line items by property name
 * @param {Array} lineItems - Array of invoice line items with descriptions
 * @returns {Object} - Object with property names as keys and arrays of line items as values
 * @example
 * const lineItems = [
 *   { description: "Mowing (Main House)", amount: 50 },
 *   { description: "Trimming (Back Yard)", amount: 75 },
 *   { description: "Mowing (Back Yard)", amount: 45 }
 * ];
 * groupServicesByProperty(lineItems) 
 * // returns:
 * // {
 * //   "Main House": [{ description: "Mowing", amount: 50 }],
 * //   "Back Yard": [
 * //     { description: "Trimming", amount: 75 },
 * //     { description: "Mowing", amount: 45 }
 * //   ]
 * // }
 */
const groupServicesByProperty = (lineItems) => {
  const groups = {};
  
  lineItems.forEach(item => {
    const propertyName = extractPropertyName(item.description);
    const cleanDescription = cleanServiceDescription(item.description);
    
    if (propertyName) {
      if (!groups[propertyName]) {
        groups[propertyName] = [];
      }
      groups[propertyName].push({
        ...item,
        description: cleanDescription
      });
    } else {
      // Handle services without property designation
      const defaultGroup = 'Main Property';
      if (!groups[defaultGroup]) {
        groups[defaultGroup] = [];
      }
      groups[defaultGroup].push(item);
    }
  });
  
  return groups;
};

export {
  isMultiPropertyInvoice,
  extractPropertyName,
  cleanServiceDescription,
  groupServicesByProperty
};