import sql from 'mssql';
import DatabaseConnection from '../config/database.config';
import { BatchInsertResult, ImportRecord } from '../types';
import logger from '../utils/logger';

// SQL Server query result types
interface TableCountResult {
  count: number;
}

interface ColumnNameResult {
  COLUMN_NAME: string;
}

class DataRepository {
  private readonly db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Bulk insert records using Table-Valued Parameters
   * This is the most efficient method for SQL Server bulk inserts
   */
  async bulkInsert(
    tableName: string,
    records: ImportRecord[],
    columnMapping?: Record<string, string>
  ): Promise<BatchInsertResult> {
    const pool = this.db.getPool();
    const transaction = pool.transaction();

    let inserted = 0;
    const errors: Array<{ row: number; error: string }> = [];

    try {
      await transaction.begin();

      // Get table columns from the first record
      const sampleRecord = records[0];
      const columns = Object.keys(sampleRecord);

      // Apply column mapping if provided
      const mappedColumns = columnMapping
        ? columns.map((col) => columnMapping[col] || col)
        : columns;

      // Build the INSERT query with parameterized values
      const columnList = mappedColumns.join(', ');
      const valuesList = mappedColumns.map((_, i) => `@col${i}`).join(', ');
      const insertQuery = `INSERT INTO ${tableName} (${columnList}) VALUES (${valuesList})`;

      // Prepare request
      const request = transaction.request();

      // Insert records in batch
      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];

          // Clear previous parameters
          request.parameters = {};

          // Add parameters for each column
          for (let index = 0; index < columns.length; index++) {
            const col = columns[index];
            const value = record[col];
            const sqlType = this.inferSqlType(value);
            request.input(`col${index}`, sqlType, value);
          }

          await request.query(insertQuery);
          inserted++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push({ row: i + 1, error: errorMessage });
          logger.warn(`Failed to insert row ${i + 1}: ${errorMessage}`);
        }
      }

      await transaction.commit();

      logger.info(
        `Bulk insert completed: ${inserted} inserted, ${errors.length} failed`
      );

      return {
        inserted,
        failed: errors.length,
        errors,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Bulk insert transaction failed:', error);
      throw error;
    }
  }

  /**
   * Optimized bulk insert using TVP (Table-Valued Parameters)
   * Most efficient for large batches
   */
  async bulkInsertWithTVP(
    tableName: string,
    records: ImportRecord[],
    columnMapping?: Record<string, string>
  ): Promise<BatchInsertResult> {
    const pool = this.db.getPool();

    try {
      // Create table from records
      const table = new sql.Table(tableName);
      table.create = false; // Table must exist

      // Get columns from first record
      const sampleRecord = records[0];
      const columns = Object.keys(sampleRecord);

      // Define table columns with inferred types
      for (const col of columns) {
        const mappedCol = columnMapping?.[col] || col;
        const sampleValue = sampleRecord[col];
        const sqlType = this.inferSqlType(sampleValue);
        table.columns.add(mappedCol, sqlType, { nullable: true });
      }

      // Add rows to table
      for (const record of records) {
        const row = columns.map((col) => record[col]);
        table.rows.add(...row);
      }

      // Execute bulk insert
      const request = pool.request();
      await request.bulk(table);

      logger.info(
        `TVP bulk insert completed: ${records.length} records inserted`
      );

      return {
        inserted: records.length,
        failed: 0,
        errors: [],
      };
    } catch (error) {
      logger.error('TVP bulk insert failed:', error);
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const pool = this.db.getPool();

    try {
      const result = await pool
        .request()
        .input('tableName', sql.NVarChar, tableName).query<TableCountResult>(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = @tableName
        `);

      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error('Error checking table existence:', error);
      return false;
    }
  }

  /**
   * Get table column information
   */
  async getTableColumns(tableName: string): Promise<string[]> {
    const pool = this.db.getPool();

    try {
      const result = await pool
        .request()
        .input('tableName', sql.NVarChar, tableName).query<ColumnNameResult>(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);

      return result.recordset.map((row) => row.COLUMN_NAME);
    } catch (error) {
      logger.error('Error getting table columns:', error);
      throw error;
    }
  }

  /**
   * Infer SQL Server data type from JavaScript value
   */
  private inferSqlType(
    value: string | number | boolean | Date | null | undefined
  ): sql.ISqlType {
    if (value === null || value === undefined) {
      return sql.NVarChar(sql.MAX);
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? sql.Int() : sql.Decimal(18, 2);
    }

    if (typeof value === 'boolean') {
      return sql.Bit();
    }

    if (value instanceof Date) {
      return sql.DateTime();
    }

    // Check if string represents a date
    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}/;
      const dateTest = new Date(value);
      if (!Number.isNaN(dateTest.getTime()) && datePattern.exec(value)) {
        return sql.DateTime();
      }

      // String length check for appropriate type
      if (value.length > 4000) {
        return sql.NVarChar(sql.MAX);
      }
      return sql.NVarChar(value.length > 255 ? 4000 : 255);
    }

    return sql.NVarChar(sql.MAX);
  }
}

export default new DataRepository();
