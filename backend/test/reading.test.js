import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { authHeader, cleanDatabase, createUserAndLogin, disconnect } from './helpers.js';

const VALID = { readingDate: '2026-03-10', timeSlot: 'AFTER_LUNCH', glucoseValue: 140 };

let owner;
let other;

beforeEach(async () => {
  await cleanDatabase();
  owner = await createUserAndLogin('owner@example.com');
  other = await createUserAndLogin('stranger@example.com');
});
afterAll(disconnect);

const createReading = (session, body = VALID) =>
  request(app).post('/api/readings').set(authHeader(session.accessToken)).send(body);

describe('POST /api/readings validation', () => {
  it('creates a valid reading', async () => {
    const res = await createReading(owner);

    expect(res.status).toBe(201);
    expect(res.body.data.reading.glucoseValue).toBe(140);
    expect(res.body.data.reading.readingDate).toBe('2026-03-10');
    expect(res.body.data.reading.timeSlotLabel).toBe('After lunch');
  });

  it('requires a glucose value', async () => {
    const res = await createReading(owner, { ...VALID, glucoseValue: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please enter a glucose value.');
  });

  it.each([39, 601, 120.5])('rejects glucose value %s', async (value) => {
    const res = await createReading(owner, { ...VALID, glucoseValue: value });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('accepts the boundary values 40 and 600', async () => {
    const low = await createReading(owner, { ...VALID, timeSlot: 'MORNING', glucoseValue: 40 });
    const high = await createReading(owner, { ...VALID, timeSlot: 'AFTER_DINNER', glucoseValue: 600 });
    expect(low.status).toBe(201);
    expect(high.status).toBe(201);
  });

  it('rejects a future date', async () => {
    const res = await createReading(owner, { ...VALID, readingDate: '2999-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Date cannot be in the future.');
  });

  it('rejects an invalid time slot', async () => {
    const res = await createReading(owner, { ...VALID, timeSlot: 'NIGHT' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please select a valid time slot.');
  });

  it('rejects a second reading for the same slot and date', async () => {
    await createReading(owner);
    const res = await createReading(owner, { ...VALID, glucoseValue: 150 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You already have an After lunch reading for this date.');
  });

  it('allows the same slot on a different date', async () => {
    await createReading(owner);
    const res = await createReading(owner, { ...VALID, readingDate: '2026-03-11' });
    expect(res.status).toBe(201);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).post('/api/readings').send(VALID);
    expect(res.status).toBe(401);
  });
});

describe('Reading CRUD and ownership', () => {
  it('lists only the authenticated user readings', async () => {
    await createReading(owner);
    await createReading(other, { ...VALID, timeSlot: 'MORNING' });

    const res = await request(app).get('/api/readings').set(authHeader(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.readings).toHaveLength(1);
  });

  it('gets one of your own readings', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const res = await request(app).get(`/api/readings/${id}`).set(authHeader(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.reading.id).toBe(id);
  });

  it('returns 404 when another user tries to read a reading', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const res = await request(app).get(`/api/readings/${id}`).set(authHeader(other.accessToken));
    expect(res.status).toBe(404);
  });

  it('updates your own reading, keeping its own slot without a false duplicate error', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const res = await request(app)
      .put(`/api/readings/${id}`)
      .set(authHeader(owner.accessToken))
      .send({ ...VALID, glucoseValue: 175 });

    expect(res.status).toBe(200);
    expect(res.body.data.reading.glucoseValue).toBe(175);
  });

  it('blocks an update that moves a reading into an occupied slot', async () => {
    await createReading(owner, { ...VALID, timeSlot: 'MORNING' });
    const lunch = await createReading(owner);
    const id = lunch.body.data.reading.id;

    const res = await request(app)
      .put(`/api/readings/${id}`)
      .set(authHeader(owner.accessToken))
      .send({ ...VALID, timeSlot: 'MORNING' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You already have a Morning reading for this date.');
  });

  it('prevents another user from updating a reading', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const res = await request(app)
      .put(`/api/readings/${id}`)
      .set(authHeader(other.accessToken))
      .send({ ...VALID, glucoseValue: 200 });

    expect(res.status).toBe(404);
  });

  it('deletes your own reading and then it is gone', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const del = await request(app).delete(`/api/readings/${id}`).set(authHeader(owner.accessToken));
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/readings/${id}`).set(authHeader(owner.accessToken));
    expect(get.status).toBe(404);
  });

  it('prevents another user from deleting a reading', async () => {
    const created = await createReading(owner);
    const id = created.body.data.reading.id;

    const res = await request(app).delete(`/api/readings/${id}`).set(authHeader(other.accessToken));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed reading id', async () => {
    const res = await request(app).get('/api/readings/not-a-uuid').set(authHeader(owner.accessToken));
    expect(res.status).toBe(400);
  });
});
