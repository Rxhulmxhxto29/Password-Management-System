import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { errorHandler, logger } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import passwordRoutes from './routes/passwords.js';
import totpRoutes from './routes/totp.js';

const app = express();
const PORT = process.env.PORT || 5000;

// -- Security headers (strict CSP) -------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
}));

// -- CORS from env variable ---------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Electron, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// -- Body parsing with size limit ---------------------------------------------
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// -- Rate limiters ------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

app.use('/api/', globalLimiter);

// -- Request logging ----------------------------------------------------------
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// -- Health check -------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -- API v1 routes ------------------------------------------------------------
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/auth/totp', authLimiter, totpRoutes);
app.use('/api/v1/passwords', passwordRoutes);

// -- 404 handler --------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// -- Global error handler (LAST middleware) -----------------------------------
app.use(errorHandler);

// -- Database connection ------------------------------------------------------
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (uri) {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB Atlas');
  } else {
    // Fallback to in-memory MongoDB for zero-config local dev / testing
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      binary: { version: '7.0.0' },
      instance: { launchTimeout: 60000 },
    });
    await mongoose.connect(mongod.getUri());
    logger.info('Connected to in-memory MongoDB (no MONGO_URI set)');
  }
}

// -- Start server -------------------------------------------------------------
const server = app.listen(PORT, async () => {
  await connectDB();
  logger.info(`Secure Vault API running on port ${PORT}`);
});

// -- Graceful shutdown --------------------------------------------------------
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
});

export default app;
