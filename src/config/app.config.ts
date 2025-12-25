import dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'excel-import-microservice',

  upload: {
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '.xlsx').split(','),
    tempPath: process.env.UPLOAD_TEMP_PATH || '/tmp/uploads',
  },

  batch: {
    size: Number.parseInt(process.env.BATCH_SIZE || '1000', 10),
    maxConcurrentJobs: Number.parseInt(
      process.env.MAX_CONCURRENT_JOBS || '5',
      10
    ),
  },

  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: Number.parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  job: {
    retentionDays: Number.parseInt(process.env.JOB_RETENTION_DAYS || '7', 10),
  },
};

export const isDevelopment = appConfig.nodeEnv === 'development';
export const isProduction = appConfig.nodeEnv === 'production';
