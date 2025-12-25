import { QueueOptions, WorkerOptions } from 'bullmq';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import logger from '../utils/logger';

dotenv.config();

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number.parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

export const queueConfig = {
  name: process.env.QUEUE_NAME || 'excel-import-queue',
  attempts: Number.parseInt(process.env.QUEUE_ATTEMPTS || '3', 10),
  backoffDelay: Number.parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000', 10),
};

export const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: queueConfig.attempts,
    backoff: {
      type: 'exponential',
      delay: queueConfig.backoffDelay,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
};

export const workerOptions: WorkerOptions = {
  connection: redisConnection,
  concurrency: Number.parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
  limiter: {
    max: 10,
    duration: 1000, // Max 10 jobs per second
  },
};

export { redisConnection };
