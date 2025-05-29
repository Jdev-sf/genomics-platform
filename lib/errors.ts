// lib/errors.ts
export enum ErrorCode {
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  
  // Business logic errors
  GENE_NOT_FOUND = 'GENE_NOT_FOUND',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  INVALID_GENOMIC_COORDINATES = 'INVALID_GENOMIC_COORDINATES',
  INVALID_VCF_FORMAT = 'INVALID_VCF_FORMAT',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  
  // File handling errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  MALFORMED_FILE = 'MALFORMED_FILE',
  
  // Authentication/Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    isOperational: boolean = true,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    this.requestId = requestId;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      requestId: this.requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context, requestId);
    this.field = field;
    this.value = value;
  }
}

export class NotFoundError extends AppError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(
    resource: string,
    resourceId?: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    const message = resourceId 
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`;
    
    super(message, ErrorCode.NOT_FOUND, 404, true, context, requestId);
    this.resource = resource;
    this.resourceId = resourceId;
  }
}

export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly table?: string;

  constructor(
    message: string,
    operation: string,
    table?: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(
      message, 
      ErrorCode.DATABASE_QUERY_ERROR, 
      500, 
      true, 
      { ...context, operation, table }, 
      requestId
    );
    this.operation = operation;
    this.table = table;
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, ErrorCode.UNAUTHORIZED, 401, true, context, requestId);
  }
}

export class AuthorizationError extends AppError {
  public readonly requiredPermission?: string;

  constructor(
    message: string = 'Insufficient permissions',
    requiredPermission?: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, ErrorCode.FORBIDDEN, 403, true, context, requestId);
    this.requiredPermission = requiredPermission;
  }
}

export class RateLimitError extends AppError {
  public readonly limit: number;
  public readonly resetTime: number;

  constructor(
    limit: number,
    resetTime: number,
    context?: Record<string, any>,
    requestId?: string
  ) {
    const message = `Rate limit exceeded. ${limit} requests per window. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`;
    super(message, ErrorCode.TOO_MANY_REQUESTS, 429, true, context, requestId);
    this.limit = limit;
    this.resetTime = resetTime;
  }
}

export class GenomicsError extends AppError {
  public readonly genomicContext?: {
    chromosome?: string;
    position?: number;
    gene?: string;
    variant?: string;
    line?: number;
    content?: string;
    fileName?: string;
    reason?: string;
  };

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    genomicContext?: {
      chromosome?: string;
      position?: number;
      gene?: string;
      variant?: string;
      line?: number;
      content?: string;
      fileName?: string;
      reason?: string;
    },
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, code, statusCode, true, context, requestId);
    this.genomicContext = genomicContext;
  }
}

// Utility functions for error handling
export class ErrorHandler {
  static createError(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(message, code, statusCode, true, context, requestId);
  }

  static createValidationError(
    message: string,
    field?: string,
    value?: any,
    requestId?: string
  ): ValidationError {
    return new ValidationError(message, field, value, undefined, requestId);
  }

  static createNotFoundError(
    resource: string,
    resourceId?: string,
    requestId?: string
  ): NotFoundError {
    return new NotFoundError(resource, resourceId, undefined, requestId);
  }

  static createDatabaseError(
    message: string,
    operation: string,
    table?: string,
    requestId?: string
  ): DatabaseError {
    return new DatabaseError(message, operation, table, undefined, requestId);
  }

  static   createGenomicsError(
    message: string,
    code: ErrorCode,
    genomicContext?: {
      chromosome?: string;
      position?: number;
      gene?: string;
      variant?: string;
      line?: number;
      content?: string;
      fileName?: string;
      reason?: string;
    },
    requestId?: string
  ): GenomicsError {
    return new GenomicsError(message, code, 400, genomicContext, undefined, requestId);
  }

  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  static getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }

  static formatErrorResponse(error: Error, requestId?: string) {
    if (error instanceof AppError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          timestamp: error.timestamp.toISOString(),
          requestId: error.requestId || requestId,
          ...(error.context && { context: error.context }),
          ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack,
            details: error.toJSON() 
          }),
        }
      };
    }

    // Handle non-AppError instances
    return {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'production' 
          ? 'An internal server error occurred' 
          : error.message,
        timestamp: new Date().toISOString(),
        requestId,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      }
    };
  }
}

// Error factory functions for common genomics errors
export const GenomicsErrors = {
  geneNotFound: (geneId: string, requestId?: string) =>
    new NotFoundError('Gene', geneId, { geneId }, requestId),
  
  variantNotFound: (variantId: string, requestId?: string) =>
    new NotFoundError('Variant', variantId, { variantId }, requestId),
  
  invalidChromosome: (chromosome: string, requestId?: string) =>
    new GenomicsError(
      `Invalid chromosome: ${chromosome}`,
      ErrorCode.INVALID_GENOMIC_COORDINATES,
      400,
      { chromosome },
      undefined,
      requestId
    ),
  
  invalidPosition: (position: number, chromosome: string, requestId?: string) =>
    new GenomicsError(
      `Invalid genomic position: ${position} on chromosome ${chromosome}`,
      ErrorCode.INVALID_GENOMIC_COORDINATES,
      400,
      { chromosome, position },
      undefined,
      requestId
    ),
  
  vcfParsingError: (line: number, content: string, requestId?: string) =>
    new GenomicsError(
      `VCF parsing error at line ${line}`,
      ErrorCode.INVALID_VCF_FORMAT,
      400,
      { line, content: content.substring(0, 100) },
      undefined,
      requestId
    ),
  
  importFailed: (fileName: string, reason: string, requestId?: string) =>
    new GenomicsError(
      `Import failed for file ${fileName}: ${reason}`,
      ErrorCode.IMPORT_FAILED,
      400,
      { fileName, reason },
      undefined,
      requestId
    ),
};

export default AppError;