import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import prisma from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    // Requests without Origin (for example health checks and server-to-server calls)
    // are allowed by CORS. Cookie-authenticated routes enforce Origin separately.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Liveness/readiness endpoint: returns 503 if PostgreSQL cannot be reached.
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ success: true, data: { status: 'ok', database: 'connected' } });
  } catch {
    return res.status(503).json({
      success: false,
      data: { status: 'unavailable', database: 'disconnected' },
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

// Exported so Supertest can call the app without starting a real server.
export default app;

// Tests set VITEST=true, which stops the server from listening on the port.
if (process.env.VITEST !== 'true') {
  if (process.env.NODE_ENV === 'production') {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET || '';
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || '';
    if (accessSecret.length < 32 || refreshSecret.length < 32 || accessSecret === refreshSecret) {
      throw new Error('Production requires two different JWT secrets of at least 32 characters.');
    }
    if (!process.env.DATABASE_URL || allowedOrigins.length === 0) {
      throw new Error('Production requires DATABASE_URL and CLIENT_URL.');
    }
  }

  const PORT = Number(process.env.PORT) || 7005;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sweety API running on port ${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
