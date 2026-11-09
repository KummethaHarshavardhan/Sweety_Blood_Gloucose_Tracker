import { formatShortDate, shiftDays } from './dateUtils.js';

// Builds one point per calendar day between from and to.
// Days without readings get average null, so the chart shows a gap instead of a false zero.
export const buildDailySeries = (readings, from, to) => {
  if (!from || !to) return [];

  const valuesByDate = {};
  readings.forEach((reading) => {
    if (!valuesByDate[reading.readingDate]) valuesByDate[reading.readingDate] = [];
    valuesByDate[reading.readingDate].push(reading.glucoseValue);
  });

  const series = [];
  for (let date = from; date <= to; date = shiftDays(date, 1)) {
    const values = valuesByDate[date] || [];
    const total = values.reduce((sum, value) => sum + value, 0);
    series.push({
      date,
      label: formatShortDate(date),
      average: values.length ? Math.round((total / values.length) * 10) / 10 : null,
      count: values.length,
    });
  }
  return series;
};
