export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // Handle yyyy-mm-dd format by parsing it correctly to avoid timezone issues
  if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-');
    return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
  }
  
  // Fallback for other date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  // Format as mm/dd/yyyy
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
};