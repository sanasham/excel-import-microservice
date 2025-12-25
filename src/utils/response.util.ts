import { Response } from 'express';
import { ApiResponse, ValidationError } from '../types';

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  correlationId: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    correlationId,
    timestamp: new Date(),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  correlationId: string,
  statusCode: number = 500
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    correlationId,
    timestamp: new Date(),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: ValidationError[],
  correlationId: string
): Response => {
  const response: ApiResponse = {
    success: false,
    error: 'Validation failed',
    data: { validationErrors: errors },
    correlationId,
    timestamp: new Date(),
  };
  return res.status(400).json(response);
};
