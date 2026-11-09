import { GLUCOSE_MAX, GLUCOSE_MIN, SLOT_BY_VALUE } from './constants.js';

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateLogin = ({ email, password }) => {
  const errors = {};
  const cleanEmail = email.trim();
  if (!cleanEmail) errors.email = 'Email is required.';
  else if (!isValidEmail(cleanEmail)) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
};

export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = {};
  const cleanName = name.trim();
  const cleanEmail = email.trim();

  if (!cleanName) errors.name = 'Name is required.';
  else if (cleanName.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  if (!cleanEmail) errors.email = 'Email is required.';
  else if (!isValidEmail(cleanEmail)) errors.email = 'Please enter a valid email address.';
  else if (cleanEmail.length > 150) errors.email = 'Email must be 150 characters or fewer.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Za-z]/.test(password)) errors.password = 'Password must contain at least one letter.';
  else if (!/\d/.test(password)) errors.password = 'Password must contain at least one number.';

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
};

export const validateReading = ({ readingDate, timeSlot, glucoseValue, today }) => {
  const errors = {};

  if (!readingDate) errors.readingDate = 'Please select a date.';
  else if (readingDate > today) errors.readingDate = 'Date cannot be in the future.';

  if (!SLOT_BY_VALUE[timeSlot]) errors.timeSlot = 'Please select a valid time slot.';

  const raw = String(glucoseValue ?? '').trim();
  if (!raw) {
    errors.glucoseValue = 'Please enter a glucose value.';
  } else {
    const number = Number(raw);
    if (!Number.isInteger(number) || number < GLUCOSE_MIN || number > GLUCOSE_MAX) {
      errors.glucoseValue = `Value must be between ${GLUCOSE_MIN} and ${GLUCOSE_MAX} mg/dl.`;
    }
  }

  return errors;
};
