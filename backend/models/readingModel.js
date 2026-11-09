import prisma from '../config/db.js';

export const TIME_SLOTS = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'];
export const MAX_READINGS_PER_DAY = 4;
export const GLUCOSE_MIN = 40;
export const GLUCOSE_MAX = 600;

export const SLOT_LABELS = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

const DUPLICATE_PHRASES = {
  MORNING: 'a Morning',
  AFTER_BREAKFAST: 'an After breakfast',
  AFTER_LUNCH: 'an After lunch',
  AFTER_DINNER: 'an After dinner',
};

export const duplicateSlotMessage = (timeSlot) =>
  `You already have ${DUPLICATE_PHRASES[timeSlot]} reading for this date.`;



export const isValidDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};


export const todayInAppTimezone = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const toDateObject = (dateString) => new Date(`${dateString}T00:00:00.000Z`);
export const toDateString = (date) => date.toISOString().slice(0, 10);

export const formatReading = (reading) => ({
  id: reading.id,
  readingDate: toDateString(reading.readingDate),
  timeSlot: reading.timeSlot,
  timeSlotLabel: SLOT_LABELS[reading.timeSlot],
  glucoseValue: reading.glucoseValue,
  createdAt: reading.createdAt,
  updatedAt: reading.updatedAt,
});



export const findReadingForUser = (id, userId) =>
  prisma.reading.findFirst({ where: { id, userId } });

export const findSlotConflict = ({ userId, readingDate, timeSlot, excludeId }) =>
  prisma.reading.findFirst({
    where: {
      userId,
      readingDate: toDateObject(readingDate),
      timeSlot,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

export const countReadingsOnDate = ({ userId, readingDate, excludeId }) =>
  prisma.reading.count({
    where: {
      userId,
      readingDate: toDateObject(readingDate),
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

export const insertReading = ({ userId, readingDate, timeSlot, glucoseValue }) =>
  prisma.reading.create({
    data: { userId, readingDate: toDateObject(readingDate), timeSlot, glucoseValue },
  });

export const updateReadingById = (id, { readingDate, timeSlot, glucoseValue }) =>
  prisma.reading.update({
    where: { id },
    data: { readingDate: toDateObject(readingDate), timeSlot, glucoseValue },
  });

export const deleteReadingForUser = (id, userId) =>
  prisma.reading.deleteMany({ where: { id, userId } });

export const listReadingsForUser = ({ userId, from, to }) => {
  const dateFilter = {};
  if (from) dateFilter.gte = toDateObject(from);
  if (to) dateFilter.lte = toDateObject(to);

  return prisma.reading.findMany({
    where: { userId, ...(from || to ? { readingDate: dateFilter } : {}) },
    orderBy: [{ readingDate: 'desc' }, { timeSlot: 'asc' }],
  });
};

export const aggregateReadingsForUser = ({ userId, from, to }) =>
  prisma.reading.aggregate({
    where: {
      userId,
      readingDate: { gte: toDateObject(from), lte: toDateObject(to) },
    },
    _count: { _all: true },
    _max: { glucoseValue: true },
    _min: { glucoseValue: true },
    _avg: { glucoseValue: true },
  });
