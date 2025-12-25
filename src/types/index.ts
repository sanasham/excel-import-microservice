// Re-export job types
export * from './job.types';

// Import record structure
export interface ImportRecord {
  [key: string]: string | number | Date | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId: string;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: string | number | boolean | null;
}

export interface BatchInsertResult {
  inserted: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ExcelValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  rowCount: number;
  columns: string[];
}
export type FileValidation =
  | { isValid: true; error?: never } // Success: no error
  | { isValid: false; error: string }; // Failure: error required
