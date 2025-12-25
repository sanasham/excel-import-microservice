import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { getCorrelationId } from '../utils/correlation-id';
import logger from '../utils/logger';
import { sendError } from '../utils/response.util';

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const correlationId = getCorrelationId(req);

  // Log error
  logger.error('Error occurred', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known operational errors
  if (err instanceof AppError && err.isOperational) {
    sendError(res, err.message, correlationId, err.statusCode);
    return;
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    const multerError = err as MulterError;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 'File size exceeds maximum limit', correlationId, 413);
      return;
    }
    sendError(res, `File upload error: ${err.message}`, correlationId, 400);
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    sendError(res, err.message, correlationId, 400);
    return;
  }

  // Handle unknown errors
  sendError(res, 'An unexpected error occurred', correlationId, 500);
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const correlationId = getCorrelationId(req);
  sendError(res, `Route ${req.path} not found`, correlationId, 404);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
