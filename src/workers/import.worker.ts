import { Job, Worker } from 'bullmq';
import fs from 'node:fs';
import DatabaseConnection from '../config/database.config';
import { queueConfig, workerOptions } from '../config/queue.config';
import { cleanupFile } from '../middleware/upload.middleware';
import importService from '../services/import.service';
import { JobData, JobProgress } from '../types';
import logger from '../utils/logger';

class ImportWorker {
  private readonly worker: Worker;

  constructor() {
    this.worker = new Worker(
      queueConfig.name,
      this.processJob.bind(this),
      workerOptions
    );

    this.setupEventListeners();
  }

  /**
   * Process import job
   */
  private async processJob(job: Job<JobData>): Promise<any> {
    const {
      jobId,
      fileName,
      filePath,
      tableName,
      columnMapping,
      correlationId,
    } = job.data;

    logger.info(`Processing job ${jobId}`, {
      correlationId,
      fileName,
      tableName,
    });

    try {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Process import with progress updates
      const result = await importService.processImport(
        filePath,
        tableName,
        undefined,
        columnMapping,
        0,
        (progress: JobProgress) => {
          // Update job progress
          job.updateProgress(progress);
          logger.info(`Job ${jobId} progress: ${progress.percentage}%`, {
            correlationId,
            processed: progress.processed,
            total: progress.total,
          });
        }
      );

      logger.info(`Job ${jobId} completed successfully`, {
        correlationId,
        result,
      });

      return result;
    } catch (error) {
      logger.error(`Job ${jobId} failed:`, {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      // Cleanup uploaded file
      cleanupFile(filePath);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Worker lifecycle events
    this.worker.on('active', (job) => {
      logger.info(`Worker started processing job ${job.id}`);
    });

    this.worker.on('completed', (job, result) => {
      logger.info(`Worker completed job ${job.id}`, { result });
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Worker failed job ${job?.id}:`, {
        error: error.message,
        stack: error.stack,
      });
    });

    this.worker.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress:`, progress);
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    await this.worker.close();
  }
}

// Initialize worker when module is loaded
let workerInstance: ImportWorker | null = null;

export const startWorker = async (): Promise<void> => {
  try {
    // Initialize database connection
    const db = DatabaseConnection.getInstance();
    await db.connect();

    // Start worker
    workerInstance = new ImportWorker();
    logger.info('Import worker started successfully');
  } catch (error) {
    logger.error('Failed to start import worker:', error);
    throw error;
  }
};

export const stopWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    logger.info('Import worker stopped');
  }
};

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await stopWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await stopWorker();
  process.exit(0);
});
