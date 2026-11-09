import request from 'supertest';
import app from '../server.js';
import prisma from '../config/db.js';

export const TEST_PASSWORD = 'Sweety@123';

export const cleanDatabase = async () => {
  await prisma.reading.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
};

// Registers and logs in a user, returning the access token and the refresh cookie
export const createUserAndLogin = async (email = 'tester@example.com') => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: TEST_PASSWORD });

  const res = await request(app).post('/api/auth/login')
    .set('Origin', process.env.CLIENT_URL)
    .send({ email, password: TEST_PASSWORD });

  return {
    accessToken: res.body.data.accessToken,
    cookie: res.headers['set-cookie'][0].split(';')[0],
    user: res.body.data.user,
  };
};

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const disconnect = () => prisma.$disconnect();
