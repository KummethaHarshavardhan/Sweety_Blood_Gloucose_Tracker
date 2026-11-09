import {
  aggregateReadingsForUser,
  formatReading,
  listReadingsForUser,
  todayInAppTimezone,
} from '../models/readingModel.js';

const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);

const monthBounds = (year, month) => ({
  from: toIso(Date.UTC(year, month - 1, 1)),
  to: toIso(Date.UTC(year, month, 0)),
});

const splitDate = (dateString) => {
  const [year, month] = dateString.split('-').map(Number);
  return { year, month };
};

const buildStats = (aggregate) => {
  const totalReadings = aggregate._count._all;
  if (totalReadings === 0) {
    return { totalReadings: 0, highest: null, lowest: null, average: null };
  }
  return {
    totalReadings,
    highest: aggregate._max.glucoseValue,
    lowest: aggregate._min.glucoseValue,
    average: Math.round(aggregate._avg.glucoseValue * 10) / 10,
  };
};

const reportDate = (req) => req.query.date || todayInAppTimezone();

export const dailyReport = async (req, res) => {
  const date = reportDate(req);
  const userId = req.user.id;

  const [aggregate, readings] = await Promise.all([
    aggregateReadingsForUser({ userId, from: date, to: date }),
    listReadingsForUser({ userId, from: date, to: date }),
  ]);

  res.json({
    success: true,
    data: {
      date,
      from: date,
      to: date,
      ...buildStats(aggregate),
      readings: readings.map(formatReading),
    },
  });
};

// GET /api/reports/month-to-date?date=YYYY-MM-DD
// Covers the 1st of the selected month through the selected date.
export const monthToDateReport = async (req, res) => {
  const date = reportDate(req);
  const { year, month } = splitDate(date);
  const from = monthBounds(year, month).from;

  const aggregate = await aggregateReadingsForUser({ userId: req.user.id, from, to: date });

  res.json({
    success: true,
    data: { from, to: date, ...buildStats(aggregate) },
  });
};

// GET /api/reports/monthly?date=YYYY-MM-DD
// Returns the complete calendar month before the month containing the selected date.
export const monthlyReport = async (req, res) => {
  const date = reportDate(req);
  const { year, month } = splitDate(date);
  const previous = monthBounds(year, month - 1);

  const aggregate = await aggregateReadingsForUser({
    userId: req.user.id,
    from: previous.from,
    to: previous.to,
  });

  res.json({
    success: true,
    data: {
      month: previous.from.slice(0, 7),
      from: previous.from,
      to: previous.to,
      ...buildStats(aggregate),
    },
  });
};
