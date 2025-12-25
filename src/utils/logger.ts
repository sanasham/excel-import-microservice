import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { appConfig } from '../config/app.config';

// Ensure log directory exists
const logDir = appConfig.logging.dir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level, message, correlationId, ...meta }) => {
      let msg = `${timestamp} [${level}]`;
      if (correlationId) {
        msg += ` [${correlationId}]`;
      }
      msg += `: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    }
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: appConfig.logging.level,
  format: logFormat,
  defaultMeta: { service: appConfig.appName },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (appConfig.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream for Morgan (HTTP logging)
export const httpLoggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
