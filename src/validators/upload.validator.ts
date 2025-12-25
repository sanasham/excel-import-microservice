import Joi from 'joi';

/**
 * Validation schema for upload request
 */
export const uploadSchema = Joi.object({
  tableName: Joi.string()
    .required()
    .pattern(/^[a-zA-Z_]\w*$/)
    .max(128)
    .messages({
      'string.pattern.base': 'Table name must be a valid SQL identifier',
      'string.empty': 'Table name is required',
      'any.required': 'Table name is required',
    }),

  sheetName: Joi.string().optional().max(31).messages({
    'string.max': 'Sheet name cannot exceed 31 characters',
  }),

  columnMapping: Joi.object()
    .optional()
    .pattern(Joi.string(), Joi.string().pattern(/^[a-zA-Z_]\w*$/))
    .messages({
      'object.unknown': 'Invalid column mapping format',
    }),

  skipRows: Joi.number().integer().min(0).optional().default(0).messages({
    'number.base': 'Skip rows must be a number',
    'number.min': 'Skip rows cannot be negative',
  }),

  validateOnly: Joi.boolean().optional().default(false),
});

/**
 * Validate file upload
 */
export const validateFile = (
  file: Express.Multer.File
): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file uploaded' };
  }

  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only .xlsx files are allowed',
    };
  }

  if (!file.originalname.endsWith('.xlsx')) {
    return {
      isValid: false,
      error: 'Invalid file extension. Only .xlsx files are allowed',
    };
  }

  return { isValid: true };
};
