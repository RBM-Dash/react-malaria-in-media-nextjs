export const parseDate = (dateString) => {
  if (!dateString) return null;
  // Handles ISO strings like "2025-08-26T09:50:25Z"
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
      return date;
  }
  // Handles formats like "2025 Dec"
  const parts = dateString.split(' ');
  if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const monthName = parts[1].substring(0, 3);
      const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
      const month = monthMap[monthName];
      if (!isNaN(year) && month !== undefined) {
          return new Date(year, month);
      }
  }
  return null; // Return null if unparseable
};