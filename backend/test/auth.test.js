import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../server.js';
import prisma from '../config/db.js';
import { TEST_PASSWORD, authHeader, cleanDatabase, createUserAndLogin, disconnect } from './helpers.js';

beforeEach(cleanDatabase);
afterAll(disconnect);

describe('POST /api/auth/register', () => {
  it('creates a user, lowercases the email, and never returns a password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sweety', email: 'NEW@Example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sweety', email: 'hash@example.com', password: TEST_PASSWORD });

    const dbUser = await prisma.user.findUnique({ where: { email: 'hash@example.com' } });
    expect(dbUser.password).not.toBe(TEST_PASSWORD);
    expect(await bcrypt.compare(TEST_PASSWORD, dbUser.password)).toBe(true);
  });

  it('rejects a duplicate email with 409', async () => {
    const body = { name: 'Sweety', email: 'dup@example.com', password: TEST_PASSWORD };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this email already exists.');
  });

  it('returns a validation message for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Name is required.');
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sweety', email: 'weak@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password must be at least 8 characters.');
  });
});

describe('POST /api/auth/login', () => {
  it('returns an access token and sets an HttpOnly refresh cookie', async () => {
    await createUserAndLogin('login@example.com');
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_URL)
      .send({ email: 'login@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/sweety_refresh=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('stores only a hash of the refresh token', async () => {
    const session = await createUserAndLogin('hashstore@example.com');
    const rawToken = session.cookie.split('=')[1];
    const stored = await prisma.refreshToken.findFirst({ where: { userId: session.user.id } });

    expect(stored.tokenHash).not.toBe(rawToken);
    expect(stored.tokenHash).toHaveLength(64);
  });

  it('rejects a wrong password with 401', async () => {
    await createUserAndLogin('wrongpass@example.com');
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_URL)
      .send({ email: 'wrongpass@example.com', password: 'Wrong@1234' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('rejects an unknown email with the same 401 message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_URL)
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });
});

describe('JWT access token verification', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token', async () => {
    const session = await createUserAndLogin('valid@example.com');
    const res = await request(app).get('/api/auth/me').set(authHeader(session.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('valid@example.com');
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    const session = await createUserAndLogin('expired@example.com');
    const expired = jwt.sign(
      { sub: session.user.id, type: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.ACCESS_TOKEN_SECRET,
    );
    const res = await request(app).get('/api/auth/me').set(authHeader(expired));

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a token with an invalid signature', async () => {
    const session = await createUserAndLogin('forged@example.com');
    const forged = jwt.sign({ sub: session.user.id, type: 'access' }, 'attacker-secret', {
      expiresIn: '15m',
    });
    const res = await request(app).get('/api/auth/me').set(authHeader(forged));

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

describe('Refresh token rotation and revocation', () => {
  it('issues a new refresh token and access token on refresh', async () => {
    const session = await createUserAndLogin('rotate@example.com');
    const res = await request(app).post('/api/auth/refresh').set('Cookie', session.cookie).set('Origin', process.env.CLIENT_URL);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const newCookie = res.headers['set-cookie'][0].split(';')[0];
    expect(newCookie).not.toBe(session.cookie);
  });

  it('revokes the whole session when an old refresh token is reused', async () => {
    const session = await createUserAndLogin('reuse@example.com');

    const first = await request(app).post('/api/auth/refresh').set('Cookie', session.cookie).set('Origin', process.env.CLIENT_URL);
    const newCookie = first.headers['set-cookie'][0].split(';')[0];

    // Reusing the old, rotated token must fail...
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', session.cookie).set('Origin', process.env.CLIENT_URL);
    expect(reuse.status).toBe(401);

    // ...and it must also kill the newer token from the same family
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', newCookie).set('Origin', process.env.CLIENT_URL);
    expect(afterReuse.status).toBe(401);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Origin', process.env.CLIENT_URL);
    expect(res.status).toBe(401);
  });

  it('rejects refresh from an untrusted origin (CSRF protection)', async () => {
    const session = await createUserAndLogin('csrf@example.com');
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.cookie)
      .set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
  });

  it('rejects refresh when the Origin header is missing', async () => {
    const session = await createUserAndLogin('missing-origin@example.com');
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.cookie);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ORIGIN_FORBIDDEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const session = await createUserAndLogin('logout@example.com');

    const logout = await request(app).post('/api/auth/logout').set('Cookie', session.cookie).set('Origin', process.env.CLIENT_URL);
    expect(logout.status).toBe(200);

    const refreshAfter = await request(app).post('/api/auth/refresh').set('Cookie', session.cookie).set('Origin', process.env.CLIENT_URL);
    expect(refreshAfter.status).toBe(401);
  });
});
