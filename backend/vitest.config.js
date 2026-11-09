import 'dotenv/config';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required. Configure a separate test database; tests will not use DATABASE_URL.',
  );
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // All test files share one database, so run them one after another.
    fileParallelism: false,
    env: {
      VITEST: 'true',
      DATABASE_URL: testDatabaseUrl,
      ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'test_access_secret',
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret',
      ACCESS_TOKEN_EXPIRES_IN: '15m',
      REFRESH_TOKEN_EXPIRES_IN: '7d',
      CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim(),
      NODE_ENV: 'test',
      APP_TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Kolkata',
      BCRYPT_SALT_ROUNDS: '4',
    },
  },
});
