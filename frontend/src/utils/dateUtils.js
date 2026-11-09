// Dates are handled as YYYY-MM-DD strings, which is the format the backend uses.
// Local time is used for "today", so the date picker matches the user's calendar.

export const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocal = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const shiftDays = (dateString, days) => {
  const date = parseLocal(dateString);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
};

export const formatDisplayDate = (dateString) =>
  parseLocal(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatShortDate = (dateString) =>
  parseLocal(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const formatMonthYear = (dateString) =>
  parseLocal(dateString).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const formatLongDate = (isoString) =>
  new Date(isoString).toLocaleDateString(undefined, { dateStyle: 'long' });
