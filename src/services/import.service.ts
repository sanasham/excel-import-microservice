import dataRepository from '../repositories/data.repository';
import { JobProgress } from '../types';
import logger from '../utils/logger';
import excelService from './excel.service';

class ImportService {
  /**
   * Process Excel file and import to database
   */
  async processImport(
    filePath: string,
    tableName: string,
    sheetName?: string,
    columnMapping?: Record<string, string>,
    skipRows: number = 0,
    onProgress?: (progress: JobProgress) => void
  ): Promise<{ successCount: number; failedCount: number; duration: number }> {
    const startTime = Date.now();

    try {
      // Validate table exists
      const tableExists = await dataRepository.tableExists(tableName);
      if (!tableExists) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      // Get total row count
      const totalRecords = await excelService.getRowCount(
        filePath,
        sheetName,
        skipRows
      );
      logger.info(
        `Starting import of ${totalRecords} records to ${tableName}`,
        {
          filePath,
          sheetName,
          tableName,
        }
      );

      let successCount = 0;
      let failedCount = 0;
      let processedCount = 0;

      // Process Excel file in batches
      const rowGenerator = excelService.streamExcelRows(
        filePath,
        sheetName,
        skipRows
      );

      for await (const batch of rowGenerator) {
        try {
          // Use TVP for better performance
          const result = await dataRepository.bulkInsertWithTVP(
            tableName,
            batch,
            columnMapping
          );

          successCount += result.inserted;
          failedCount += result.failed;
          processedCount += batch.length;

          // Report progress
          if (onProgress) {
            const progress: JobProgress = {
              total: totalRecords,
              processed: processedCount,
              failed: failedCount,
              percentage: Math.round((processedCount / totalRecords) * 100),
            };
            onProgress(progress);
          }

          logger.info(
            `Batch processed: ${result.inserted} inserted, ${result.failed} failed`
          );
        } catch (error) {
          logger.error('Error processing batch:', error);
          failedCount += batch.length;
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Import completed in ${duration}ms`, {
        successCount,
        failedCount,
        duration,
      });

      return { successCount, failedCount, duration };
    } catch (error) {
      logger.error('Import process failed:', error);
      throw error;
    }
  }

  /**
   * Validate import without inserting
   */
  async validateImport(
    filePath: string,
    tableName: string,
    sheetName?: string,
    skipRows: number = 0
  ): Promise<{ isValid: boolean; errors: string[]; rowCount: number }> {
    const errors: string[] = [];

    try {
      // Check table exists
      const tableExists = await dataRepository.tableExists(tableName);
      if (!tableExists) {
        errors.push(`Table ${tableName} does not exist`);
      }

      // Get table columns
      let requiredColumns: string[] = [];
      if (tableExists) {
        requiredColumns = await dataRepository.getTableColumns(tableName);
      }

      // Validate Excel structure
      const validation = await excelService.validateExcel(
        filePath,
        requiredColumns,
        sheetName,
        skipRows
      );

      if (!validation.isValid) {
        for (const err of validation.errors) {
          errors.push(err.message);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        rowCount: validation.rowCount,
      };
    } catch (error) {
      logger.error('Validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        rowCount: 0,
      };
    }
  }
}

export default new ImportService();
