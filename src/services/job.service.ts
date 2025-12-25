import { Queue } from 'bullmq';
import { queueConfig, queueOptions } from '../config/queue.config';
import { JobData, JobProgress, JobResult, JobStatus } from '../types';
import logger from '../utils/logger';

class JobService {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(queueConfig.name, queueOptions);
    this.setupEventListeners();
  }

  /**
   * Add job to queue
   */
  async addJob(jobData: JobData): Promise<string> {
    try {
      const job = await this.queue.add('import-excel', jobData, {
        jobId: jobData.jobId,
        removeOnComplete: false,
        removeOnFail: false,
      });

      if (!job.id) {
        throw new Error('Job ID is undefined');
      }

      logger.info(`Job ${jobData.jobId} added to queue`, {
        correlationId: jobData.correlationId,
      });

      return job.id;
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobResult | null> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job?.id) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress as JobProgress | undefined;

      let status: JobStatus;
      switch (state) {
        case 'active':
          status = JobStatus.PROCESSING;
          break;
        case 'completed':
          status = JobStatus.COMPLETED;
          break;
        case 'failed':
          status = JobStatus.FAILED;
          break;
        default:
          status = JobStatus.PENDING;
      }

      const result: JobResult = {
        jobId: job.id,
        status,
        progress: progress || {
          total: 0,
          processed: 0,
          failed: 0,
          percentage: 0,
        },
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };

      if (state === 'completed' && job.returnvalue) {
        result.result = job.returnvalue;
      }

      if (state === 'failed' && job.failedReason) {
        result.error = job.failedReason;
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return false;
      }

      const state = await job.getState();
      if (state === 'active' || state === 'waiting') {
        await job.remove();
        logger.info(`Job ${jobId} cancelled`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get all jobs with their statuses
   */
  async getAllJobs(
    status?: 'pending' | 'active' | 'completed' | 'failed'
  ): Promise<JobResult[]> {
    try {
      let jobs;

      switch (status) {
        case 'pending':
          jobs = await this.queue.getWaiting();
          break;
        case 'active':
          jobs = await this.queue.getActive();
          break;
        case 'completed':
          jobs = await this.queue.getCompleted();
          break;
        case 'failed':
          jobs = await this.queue.getFailed();
          break;
        default: {
          const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaiting(),
            this.queue.getActive(),
            this.queue.getCompleted(),
            this.queue.getFailed(),
          ]);
          jobs = [...waiting, ...active, ...completed, ...failed];
          break;
        }
      }

      const results = await Promise.all(
        jobs
          .filter((job) => job.id !== undefined)
          .map(async (job) => {
            const state = await job.getState();
            const progress = job.progress as JobProgress | undefined;

            let jobStatus: JobStatus;
            switch (state) {
              case 'active':
                jobStatus = JobStatus.PROCESSING;
                break;
              case 'completed':
                jobStatus = JobStatus.COMPLETED;
                break;
              case 'failed':
                jobStatus = JobStatus.FAILED;
                break;
              default:
                jobStatus = JobStatus.PENDING;
            }

            const result: JobResult = {
              jobId: job.id as string,
              status: jobStatus,
              progress: progress || {
                total: 0,
                processed: 0,
                failed: 0,
                percentage: 0,
              },
              startedAt: job.processedOn
                ? new Date(job.processedOn)
                : undefined,
              completedAt: job.finishedOn
                ? new Date(job.finishedOn)
                : undefined,
            };

            if (state === 'completed' && job.returnvalue) {
              result.result = job.returnvalue;
            }

            if (state === 'failed' && job.failedReason) {
              result.error = job.failedReason;
            }

            return result;
          })
      );

      return results;
    } catch (error) {
      logger.error('Failed to get all jobs:', error);
      return [];
    }
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(
    olderThanMs: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      await this.queue.clean(olderThanMs, 100, 'completed');
      await this.queue.clean(olderThanMs, 100, 'failed');
      logger.info('Old jobs cleaned successfully');
    } catch (error) {
      logger.error('Failed to clean old jobs:', error);
    }
  }

  /**
   * Setup event listeners for queue
   * Note: Queue emits different events than Worker
   * For detailed job lifecycle events, use Worker listeners
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    // Queue only emits 'waiting' and 'error' events
    // For 'active', 'completed', 'failed' events, use Worker
    this.queue.on('waiting', (job) => {
      logger.info(`Job ${job.id ?? 'unknown'} is waiting in queue`);
    });
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

export default new JobService();
