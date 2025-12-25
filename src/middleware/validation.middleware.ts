import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { getCorrelationId } from '../utils/correlation-id';
import { sendValidationError } from '../utils/response.util';

/**
 * Validate request body against Joi schema
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      sendValidationError(res, errors, getCorrelationId(req));
      return;
    }

    req.body = value;
    next();
  };
};
