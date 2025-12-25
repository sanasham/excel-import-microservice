import ExcelJS from 'exceljs';
import { ExcelValidationResult, ImportRecord, ValidationError } from '../types';
import logger from '../utils/logger';

class ExcelService {
  /**
   * Stream Excel file and process rows in batches
   */
  async *streamExcelRows(
    filePath: string,
    sheetName?: string,
    skipRows: number = 0
  ): AsyncGenerator<ImportRecord[], void, unknown> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.readFile(filePath);

      // Get the worksheet
      const worksheet = sheetName
        ? workbook.getWorksheet(sheetName)
        : workbook.worksheets[0];

      if (!worksheet) {
        throw new Error(`Worksheet ${sheetName || 'default'} not found`);
      }

      // Get headers from first row
      const headerRow = worksheet.getRow(1 + skipRows);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value).trim();
      });

      logger.info(`Excel headers detected: ${headers.join(', ')}`);

      const batch: ImportRecord[] = []; // Changed from 'let' to 'const'
      const batchSize = 500; // Process 500 rows at a time

      // Stream rows starting after headers
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        // Skip header row and any additional skip rows
        if (rowNumber <= 1 + skipRows) {
          return;
        }

        const record: ImportRecord = {};
        let hasData = false;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            const value = this.getCellValue(cell);
            record[header] = value;
            if (value !== null && value !== '') {
              hasData = true;
            }
          }
        });

        // Only add rows that have at least one non-empty cell
        if (hasData) {
          batch.push(record);
        }
      });

      // Yield all batches after processing all rows
      for (let i = 0; i < batch.length; i += batchSize) {
        yield batch.slice(i, i + batchSize);
      }
    } catch (error) {
      logger.error('Error streaming Excel file:', error);
      throw error;
    }
  }

  /**
   * Validate Excel file structure and content
   */
  async validateExcel(
    filePath: string,
    requiredColumns: string[],
    sheetName?: string,
    skipRows: number = 0
  ): Promise<ExcelValidationResult> {
    const workbook = new ExcelJS.Workbook();
    const errors: ValidationError[] = [];

    try {
      await workbook.xlsx.readFile(filePath);

      const worksheet = sheetName
        ? workbook.getWorksheet(sheetName)
        : workbook.worksheets[0];

      if (!worksheet) {
        return {
          isValid: false,
          errors: [
            {
              field: 'worksheet',
              message: `Worksheet ${sheetName || 'default'} not found`,
            },
          ],
          rowCount: 0,
          columns: [],
        };
      }

      // Get headers
      const headerRow = worksheet.getRow(1 + skipRows);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value).trim();
      });

      // Validate required columns
      if (requiredColumns.length > 0) {
        const missingColumns = requiredColumns.filter(
          (col) => !headers.includes(col)
        );
        if (missingColumns.length > 0) {
          errors.push({
            field: 'columns',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
          });
        }
      }

      // Count rows (excluding header)
      const rowCount = worksheet.rowCount - (1 + skipRows);

      // Check for empty file
      if (rowCount === 0) {
        errors.push({
          field: 'rows',
          message: 'Excel file contains no data rows',
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        rowCount: Math.max(0, rowCount),
        columns: headers,
      };
    } catch (error) {
      logger.error('Error validating Excel file:', error);
      return {
        isValid: false,
        errors: [
          {
            field: 'file',
            message: `Failed to read Excel file: ${(error as Error).message}`,
          },
        ],
        rowCount: 0,
        columns: [],
      };
    }
  }

  /**
   * Get typed cell value
   */
  private getCellValue(cell: ExcelJS.Cell): string | number | Date | null {
    if (cell.value === null || cell.value === undefined) {
      return null;
    }

    // Handle date values
    if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value as Date;
    }

    // Handle formula results
    if (cell.type === ExcelJS.ValueType.Formula) {
      const formulaValue = (cell.value as ExcelJS.CellFormulaValue).result;
      if (formulaValue === null || formulaValue === undefined) {
        return null;
      }
      if (
        typeof formulaValue === 'number' ||
        typeof formulaValue === 'string'
      ) {
        return formulaValue;
      }
      return String(formulaValue);
    }

    // Handle rich text
    if (
      typeof cell.value === 'object' &&
      cell.value !== null &&
      'richText' in cell.value
    ) {
      const richTextValue = cell.value as ExcelJS.CellRichTextValue;
      return richTextValue.richText.map((rt) => rt.text).join('');
    }

    // Handle hyperlinks
    if (
      typeof cell.value === 'object' &&
      cell.value !== null &&
      'text' in cell.value
    ) {
      const hyperlinkValue = cell.value as ExcelJS.CellHyperlinkValue;
      return hyperlinkValue.text;
    }

    return cell.value as string | number;
  }

  /**
   * Get total row count without loading entire file
   */
  async getRowCount(
    filePath: string,
    sheetName?: string,
    skipRows: number = 0
  ): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = sheetName
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new Error(`Worksheet ${sheetName || 'default'} not found`);
    }

    return Math.max(0, worksheet.rowCount - (1 + skipRows));
  }
}

export default new ExcelService();
