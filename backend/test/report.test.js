import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { authHeader, cleanDatabase, createUserAndLogin, disconnect } from './helpers.js';

let session;

const addReading = (readingDate, timeSlot, glucoseValue) =>
  request(app)
    .post('/api/readings')
    .set(authHeader(session.accessToken))
    .send({ readingDate, timeSlot, glucoseValue });

// Data used by every report test:
// Feb 28: 150 (AFTER_DINNER)            -> belongs to February (previous month for March reports)
// Mar 1 : 90  (MORNING)                 -> March, month-to-date start day
// Mar 10: 100 (MORNING), 130 (AFTER_LUNCH), 110 (AFTER_DINNER)
beforeEach(async () => {
  await cleanDatabase();
  session = await createUserAndLogin('reports@example.com');

  await addReading('2026-02-28', 'AFTER_DINNER', 150);
  await addReading('2026-03-01', 'MORNING', 90);
  await addReading('2026-03-10', 'MORNING', 100);
  await addReading('2026-03-10', 'AFTER_LUNCH', 130);
  await addReading('2026-03-10', 'AFTER_DINNER', 110);
});
afterAll(disconnect);

const getReport = (path) => request(app).get(path).set(authHeader(session.accessToken));

describe('GET /api/reports/daily', () => {
  it('returns stats and slot-ordered readings for one day', async () => {
    const res = await getReport('/api/reports/daily?date=2026-03-10');

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.totalReadings).toBe(3);
    expect(data.highest).toBe(130);
    expect(data.lowest).toBe(100);
    expect(data.average).toBe(113.3);
    expect(data.readings.map((r) => r.timeSlot)).toEqual(['MORNING', 'AFTER_LUNCH', 'AFTER_DINNER']);
  });

  it('returns totalReadings 0 and null stats for an empty day', async () => {
    const res = await getReport('/api/reports/daily?date=2020-01-01');

    expect(res.status).toBe(200);
    expect(res.body.data.totalReadings).toBe(0);
    expect(res.body.data.highest).toBeNull();
    expect(res.body.data.average).toBeNull();
    expect(res.body.data.readings).toEqual([]);
  });

  it('rejects a malformed date', async () => {
    const res = await getReport('/api/reports/daily?date=10-03-2026');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reports/month-to-date', () => {
  it('covers the 1st of the month through the selected date', async () => {
    const res = await getReport('/api/reports/month-to-date?date=2026-03-10');

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.from).toBe('2026-03-01');
    expect(data.to).toBe('2026-03-10');
    expect(data.totalReadings).toBe(4);
    expect(data.highest).toBe(130);
    expect(data.lowest).toBe(90);
    expect(data.average).toBe(107.5);
  });

  it('excludes readings after the selected date', async () => {
    const res = await getReport('/api/reports/month-to-date?date=2026-03-01');
    expect(res.body.data.totalReadings).toBe(1);
  });
});

describe('GET /api/reports/monthly', () => {
  it('returns the complete previous calendar month', async () => {
    const res = await getReport('/api/reports/monthly?date=2026-03-10');

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.month).toBe('2026-02');
    expect(data.from).toBe('2026-02-01');
    expect(data.to).toBe('2026-02-28');
    expect(data.totalReadings).toBe(1);
    expect(data.average).toBe(150);
  });

  it('handles January by returning the previous December', async () => {
    await addReading('2025-12-31', 'MORNING', 88);
    const res = await getReport('/api/reports/monthly?date=2026-01-15');

    expect(res.body.data.month).toBe('2025-12');
    expect(res.body.data.from).toBe('2025-12-01');
    expect(res.body.data.to).toBe('2025-12-31');
    expect(res.body.data.totalReadings).toBe(1);
  });

  it('returns totalReadings 0 for a month with no data', async () => {
    const res = await getReport('/api/reports/monthly?date=2020-05-10');

    expect(res.status).toBe(200);
    expect(res.body.data.totalReadings).toBe(0);
    expect(res.body.data.average).toBeNull();
  });
});

describe('Report ownership', () => {
  it('never includes another user readings', async () => {
    const stranger = await createUserAndLogin('stranger-report@example.com');
    const res = await request(app)
      .get('/api/reports/daily?date=2026-03-10')
      .set(authHeader(stranger.accessToken));

    expect(res.body.data.totalReadings).toBe(0);
  });
});
