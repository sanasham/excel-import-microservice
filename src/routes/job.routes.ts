import { Router } from 'express';
import jobController from '../controllers/job.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with optional status filter
 * @access  Public
 * @query   status - Filter by status (pending, active, completed, failed)
 */
router.get('/', asyncHandler(jobController.getAllJobs.bind(jobController)));

/**
 * @route   GET /api/jobs/:jobId
 * @desc    Get job status by ID
 * @access  Public
 */
router.get(
  '/:jobId',
  asyncHandler(jobController.getJobStatus.bind(jobController))
);

/**
 * @route   DELETE /api/jobs/:jobId
 * @desc    Cancel job by ID
 * @access  Public
 */
router.delete(
  '/:jobId',
  asyncHandler(jobController.cancelJob.bind(jobController))
);

export default router;
