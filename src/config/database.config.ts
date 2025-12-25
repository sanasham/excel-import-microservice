import dotenv from 'dotenv';
import sql from 'mssql';
import logger from '../utils/logger';

dotenv.config();

export const dbConfig: sql.config = {
  server: process.env.DB_HOST || 'sqlserver',
  port: Number.parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ExcelDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    min: Number.parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: Number.parseInt(
    process.env.DB_CONNECTION_TIMEOUT || '30000',
    10
  ),
  requestTimeout: Number.parseInt(
    process.env.DB_REQUEST_TIMEOUT || '30000',
    10
  ),
};

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: sql.ConnectionPool | null = null;

  private constructor() {}

  /**
   * Get singleton instance of DatabaseConnection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database connection pool
   */
  public async connect(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) {
      return this.pool;
    }

    try {
      this.pool = await new sql.ConnectionPool(dbConfig).connect();
      logger.info('Database connection pool established successfully');

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Database pool error:', err);
      });

      return this.pool;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Get existing connection pool
   */
  public getPool(): sql.ConnectionPool {
    if (!this.pool?.connected) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Close database connection pool
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool?.connected) {
        return false;
      }
      const result = await this.pool.request().query('SELECT 1 AS health');
      return result.recordset[0].health === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export default DatabaseConnection;
