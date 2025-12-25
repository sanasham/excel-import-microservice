import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { cleanupFile } from '../middleware/upload.middleware';
import excelService from '../services/excel.service';
import importService from '../services/import.service';
import jobService from '../services/job.service';
import { JobData } from '../types';
import { getCorrelationId } from '../utils/correlation-id';
import logger from '../utils/logger';
import { sendError, sendSuccess } from '../utils/response.util';
import { validateFile } from '../validators/upload.validator';

class UploadController {
  /**
   * Upload and process Excel file
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    let filePath: string | undefined;

    try {
      // Validate file
      if (!req.file) {
        sendError(res, 'No file uploaded', correlationId, 400);
        return;
      }

      const fileValidation = validateFile(req.file);
      if (!fileValidation.isValid) {
        cleanupFile(req.file.path);
        sendError(
          res,
          fileValidation.error ?? 'File validation failed',
          correlationId,
          400
        );
        return;
      }

      filePath = req.file.path;
      const { tableName, sheetName, columnMapping, skipRows, validateOnly } =
        req.body;

      logger.info('File upload received', {
        correlationId,
        fileName: req.file.originalname,
        tableName,
        fileSize: req.file.size,
      });

      // If validation only, don't queue the job
      if (validateOnly === true || validateOnly === 'true') {
        const validation = await importService.validateImport(
          filePath,
          tableName,
          sheetName,
          Number.parseInt(skipRows || '0')
        );

        cleanupFile(filePath);

        if (validation.isValid) {
          sendSuccess(
            res,
            {
              message: 'File validation successful',
              rowCount: validation.rowCount,
            },
            correlationId
          );
        } else {
          sendError(
            res,
            `Validation failed: ${validation.errors.join(', ')}`,
            correlationId,
            400
          );
        }
        return;
      }

      // Get row count for job tracking
      const rowCount = await excelService.getRowCount(
        filePath,
        sheetName,
        Number.parseInt(skipRows || '0')
      );

      // Create job data
      const jobId = uuidv4();
      const jobData: JobData = {
        jobId,
        fileName: req.file.originalname,
        filePath,
        totalRecords: rowCount,
        correlationId,
        tableName,
        columnMapping: columnMapping ? JSON.parse(columnMapping) : undefined,
      };

      // Add job to queue
      await jobService.addJob(jobData);

      logger.info(`Job ${jobId} created for file ${req.file.originalname}`, {
        correlationId,
        rowCount,
      });

      // Return job ID immediately
      sendSuccess(
        res,
        {
          jobId,
          message: 'File uploaded successfully. Processing started.',
          fileName: req.file.originalname,
          totalRecords: rowCount,
        },
        correlationId,
        202
      );
    } catch (error) {
      logger.error('Upload failed:', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (filePath) {
        cleanupFile(filePath);
      }

      sendError(
        res,
        error instanceof Error ? error.message : 'Upload failed',
        correlationId,
        500
      );
    }
  }

  /**
   * Validate Excel file without importing
   */
  async validateFile(req: Request, res: Response): Promise<void> {
    const correlationId = getCorrelationId(req);
    let filePath: string | undefined;

    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', correlationId, 400);
        return;
      }

      const fileValidation = validateFile(req.file);
      if (!fileValidation.isValid) {
        cleanupFile(req.file.path);
        sendError(
          res,
          fileValidation.error ?? 'File validation failed',
          correlationId,
          400
        );
        return;
      }

      filePath = req.file.path;
      const { tableName, sheetName, skipRows } = req.body;

      const validation = await importService.validateImport(
        filePath,
        tableName,
        sheetName,
        Number.parseInt(skipRows || '0')
      );

      cleanupFile(filePath);

      if (validation.isValid) {
        sendSuccess(
          res,
          {
            message: 'File validation successful',
            rowCount: validation.rowCount,
          },
          correlationId
        );
      } else {
        sendError(
          res,
          `Validation failed: ${validation.errors.join(', ')}`,
          correlationId,
          400
        );
      }
    } catch (error) {
      logger.error('Validation failed:', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (filePath) {
        cleanupFile(filePath);
      }

      sendError(
        res,
        error instanceof Error ? error.message : 'Validation failed',
        correlationId,
        500
      );
    }
  }
}

// Export instance as default
const uploadController = new UploadController();
export default uploadController;
