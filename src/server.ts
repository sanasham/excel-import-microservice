import app from './app';
import { appConfig } from './config/app.config';
import DatabaseConnection from './config/database.config';
import logger from './utils/logger.js';
import { startWorker, stopWorker } from './workers/import.worker';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    const db = DatabaseConnection.getInstance();
    await db.connect();
    logger.info('Database connected successfully');

    // Start worker
    await startWorker();

    // Start Express server
    const server = app.listen(appConfig.port, () => {
      logger.info(`🚀 Server running on port ${appConfig.port}`, {
        environment: appConfig.nodeEnv,
        port: appConfig.port,
      });
      logger.info(`📊 Health check: http://localhost:${appConfig.port}/health`);
      logger.info(
        `📤 Upload endpoint: http://localhost:${appConfig.port}/api/upload`
      );
      logger.info(
        `📋 Jobs endpoint: http://localhost:${appConfig.port}/api/jobs`
      );
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Stop worker
          await stopWorker();

          // Close database connection
          await db.close();

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
