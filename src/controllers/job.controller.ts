import { Request, Response } from 'express';
import jobService from '../services/job.service';
import { getCorrelationId } from '../utils/correlation-id';
import logger from '../utils/logger';
import { sendError, sendSuccess } from '../utils/response.util';

class JobController {
  /**
   * Get job status by ID
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    const { jobId } = req.params;

    try {
      const jobStatus = await jobService.getJobStatus(jobId);

      if (!jobStatus) {
        sendError(res, `Job ${jobId} not found`, correlationId, 404);
        return;
      }

      sendSuccess(res, jobStatus, correlationId);
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to get job status',
        correlationId,
        500
      );
    }
  }

  /**
   * Get all jobs
   */
  async getAllJobs(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    const { status } = req.query;

    try {
      const validStatuses = ['pending', 'active', 'completed', 'failed'];
      const statusFilter =
        status && validStatuses.includes(status as string)
          ? (status as 'pending' | 'active' | 'completed' | 'failed')
          : undefined;

      const jobs = await jobService.getAllJobs(statusFilter);

      sendSuccess(
        res,
        {
          jobs,
          count: jobs.length,
          filter: statusFilter || 'all',
        },
        correlationId
      );
    } catch (error) {
      logger.error('Failed to get all jobs:', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to get jobs',
        correlationId,
        500
      );
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    const { jobId } = req.params;

    try {
      const cancelled = await jobService.cancelJob(jobId);

      if (!cancelled) {
        sendError(
          res,
          `Job ${jobId} not found or cannot be cancelled`,
          correlationId,
          400
        );
        return;
      }

      sendSuccess(
        res,
        { message: `Job ${jobId} cancelled successfully` },
        correlationId
      );
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to cancel job',
        correlationId,
        500
      );
    }
  }
}

export default new JobController();
