// Values match the backend enum TimeSlot and the backend validation rules
export const TIME_SLOTS = [
  { value: 'MORNING', label: 'Morning (fasting)', short: 'Morning', phrase: 'a Morning' },
  { value: 'AFTER_BREAKFAST', label: 'After breakfast', short: 'Breakfast', phrase: 'an After breakfast' },
  { value: 'AFTER_LUNCH', label: 'After lunch', short: 'Lunch', phrase: 'an After lunch' },
  { value: 'AFTER_DINNER', label: 'After dinner', short: 'Dinner', phrase: 'an After dinner' },
];

export const SLOT_BY_VALUE = Object.fromEntries(TIME_SLOTS.map((slot) => [slot.value, slot]));
export const GLUCOSE_MIN = 40;
export const GLUCOSE_MAX = 600;
export const MAX_READINGS_PER_DAY = 4;
