import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { appConfig } from './config/app.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import jobRoutes from './routes/job.routes';
import uploadRoutes from './routes/upload.routes';
import { correlationIdMiddleware } from './utils/correlation-id';
import logger from './utils/logger';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize Express middlewares
   */
  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: appConfig.cors.origin,
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Correlation ID
    this.app.use(correlationIdMiddleware);

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        correlationId: req.correlationId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/jobs', jobRoutes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        service: appConfig.appName,
        version: '1.0.0',
        status: 'running',
        timestamp: new Date(),
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }
}

export default new App().getApp();
