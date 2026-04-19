import winston from 'winston';

// -- Winston logger ----------------------------------------------------------
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${extra}`;
        })
      ),
    }),
  ],
});

// -- Custom error class -------------------------------------------------------
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// -- Async handler wrapper (eliminates try/catch in routes) -------------------
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -- Global error handler (must be the LAST middleware) -----------------------
export const errorHandler = (err, _req, res, _next) => {
  // Always log full error server-side
  logger.error(err.message, { stack: err.stack, name: err.name });

  // Mongoose validation error → 400 with field details
  if (err.name === 'ValidationError' && err.errors) {
    const fields = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: e.message,
    }));
    return res.status(400).json({ error: 'Validation failed', fields });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const fields = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({ error: 'Validation failed', fields });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Everything else → 500, never expose internals to client
  return res.status(500).json({ error: 'Internal server error' });
};
