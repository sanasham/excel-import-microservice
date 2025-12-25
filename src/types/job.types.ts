/**
 * Job Types and Interfaces
 * Defines all job-related type definitions for the import queue
 */

// Type for generic metadata
export type Metadata = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Job statuses throughout the processing lifecycle
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  DELAYED = 'delayed',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

/**
 * Job data payload sent to the queue
 */
export interface JobData {
  jobId: string;
  fileName: string;
  filePath: string;
  totalRecords: number;
  correlationId: string;
  tableName: string;
  sheetName?: string;
  columnMapping?: Record<string, string>;
  skipRows?: number;
  priority?: JobPriority;
  metadata?: Metadata;
  userId?: string;
  createdAt?: Date;
}

/**
 * Job progress tracking
 */
export interface JobProgress {
  total: number;
  processed: number;
  failed: number;
  percentage: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number; // in milliseconds
  recordsPerSecond?: number;
  lastUpdated?: Date;
}

/**
 * Job result after completion
 */
export interface JobResult {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  errorStack?: string;
  result?: JobCompletionResult;
  attempts?: number;
  maxAttempts?: number;
  logs?: JobLog[];
}

/**
 * Detailed result when job completes successfully
 */
export interface JobCompletionResult {
  successCount: number;
  failedCount: number;
  duration: number; // in milliseconds
  recordsPerSecond?: number;
  failedRecords?: FailedRecord[];
  tableName: string;
  fileName: string;
  warnings?: string[];
}

/**
 * Failed record details
 */
export interface FailedRecord {
  rowNumber: number;
  data?: Record<string, string | number | boolean | Date | null>;
  error: string;
  timestamp: Date;
}

/**
 * Job log entry
 */
export interface JobLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Metadata;
}

/**
 * Job statistics
 */
export interface JobStatistics {
  totalJobs: number;
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  totalRecordsProcessed: number;
  successRate: number;
}

/**
 * Job filter options
 */
export interface JobFilterOptions {
  status?: JobStatus | JobStatus[];
  startDate?: Date;
  endDate?: Date;
  tableName?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'completedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Job creation options
 */
export interface JobOptions {
  priority?: JobPriority;
  delay?: number; // delay in milliseconds
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  timeout?: number; // job timeout in milliseconds
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

/**
 * Bulk job creation
 */
export interface BulkJobData {
  jobs: JobData[];
  options?: JobOptions;
}

/**
 * Job event types for listeners
 */
export type JobEventType =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'progress'
  | 'paused'
  | 'resumed'
  | 'removed'
  | 'stalled';

/**
 * Job event payload
 */
export interface JobEvent {
  jobId: string;
  eventType: JobEventType;
  timestamp: Date;
  data?: Metadata;
  error?: string;
}

/**
 * Queue health status
 */
export interface QueueHealth {
  isHealthy: boolean;
  activeJobs: number;
  waitingJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  pausedJobs: number;
  workersCount: number;
  isPaused: boolean;
  timestamp: Date;
}

/**
 * Job retry configuration
 */
export interface JobRetryConfig {
  attempts: number;
  backoff: {
    type: 'fixed' | 'exponential';
    delay: number;
    maxDelay?: number;
  };
  onFailedAttempt?: (
    error: Error,
    attemptNumber: number
  ) => void | Promise<void>;
}

/**
 * Job scheduling options
 */
export interface JobSchedule {
  cron?: string; // Cron expression
  every?: number; // Repeat every X milliseconds
  limit?: number; // Max number of repeats
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
}
