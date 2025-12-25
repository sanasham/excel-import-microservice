import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Augment Express Request type using ES2015 module syntax
declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Middleware to add correlation ID to each request
 * Checks for existing X-Correlation-ID header or generates new UUID
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

/**
 * Get correlation ID from request
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};
