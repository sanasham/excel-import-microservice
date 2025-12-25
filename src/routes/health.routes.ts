import { Request, Response, Router } from 'express';
import DatabaseConnection from '../config/database.config';
import { redisConnection } from '../config/queue.config';
import { getCorrelationId } from '../utils/correlation-id';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req);

  try {
    // Check database connection
    const db = DatabaseConnection.getInstance();
    const dbHealthy = await db.healthCheck();

    // Check Redis connection
    const redisHealthy = redisConnection.status === 'ready';

    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      correlationId,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      correlationId,
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /health/ready
 * @desc    Readiness check for Kubernetes
 * @access  Public
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const db = DatabaseConnection.getInstance();
    const dbHealthy = await db.healthCheck();
    const redisHealthy = redisConnection.status === 'ready';

    if (dbHealthy && redisHealthy) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  } catch (error) {
    console.error(
      'Readiness check failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(503).json({ ready: false });
  }
});

/**
 * @route   GET /health/live
 * @desc    Liveness check for Kubernetes
 * @access  Public
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
