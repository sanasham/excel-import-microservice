import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { appConfig } from '../config/app.config';
import uploadController from '../controllers/upload.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import { uploadSchema } from '../validators/upload.validator';

const router = Router();

// Rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.maxRequests,
  message: 'Too many upload requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/upload
 * @desc    Upload Excel file and start import job
 * @access  Public
 */
router.post(
  '/',
  uploadLimiter,
  upload.single('file'),
  validate(uploadSchema),
  asyncHandler(uploadController.uploadFile.bind(uploadController))
);

/**
 * @route   POST /api/upload/validate
 * @desc    Validate Excel file without importing
 * @access  Public
 */
router.post(
  '/validate',
  uploadLimiter,
  upload.single('file'),
  validate(uploadSchema),
  asyncHandler(uploadController.validateFile.bind(uploadController))
);

export default router;
