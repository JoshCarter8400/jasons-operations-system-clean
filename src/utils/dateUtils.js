/**
 * Date Utilities for Jason's Landscaping System
 * All dates are handled in Eastern Time (America/New_York) for Florida business
 */

/**
 * Get today's date in Eastern Time as YYYY-MM-DD format
 * This is the correct format for HTML date inputs and database storage
 * @returns {string} Date string in YYYY-MM-DD format (Eastern Time)
 */
export const getTodayEasternTime = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
};

/**
 * Format a date string or Date object for display in Eastern Time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string (e.g., "9/15/2025")
 */
export const formatDateEastern = (date) => {
  if (!date) return 'Date not recorded';

  try {
    // Handle both string dates (YYYY-MM-DD) and Date objects
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    return dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date not recorded';
  }
};

/**
 * Get current timestamp in Eastern Time for database records
 * @returns {string} Date string in YYYY-MM-DD format (Eastern Time)
 */
export const getCurrentDateEasternTime = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
};

/**
 * Convert a Date object to YYYY-MM-DD format in Eastern Time
 * Useful for date inputs and database storage
 * @param {Date} date - Date object to convert
 * @returns {string} Date string in YYYY-MM-DD format (Eastern Time)
 */
export const toDateStringEastern = (date) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
};

// Legacy formatDate function (updated for Eastern Time consistency)
export const formatDate = (dateString) => {
  if (!dateString) return '';

  // Handle yyyy-mm-dd format by parsing it correctly to avoid timezone issues
  if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-');
    return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
  }

  // Use Eastern Time formatting for other formats
  return formatDateEastern(dateString);
};