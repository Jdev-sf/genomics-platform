// lib/error-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorHandler, ErrorCode } from './errors';
import { createLogger, createRequestContext } from './logger';
import { Prisma } from '@prisma/client';

// Global error handler for API routes
export function withErrorHandler(handler: Function) {
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const requestContext = createRequestContext(requestId, {
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url,
    });
    
    const logger = createLogger(requestContext);
    const startTime = Date.now();

    try {
      // Log incoming request
      logger.apiRequest(request.method, request.url);

      // Call the actual handler
      const response = context 
        ? await handler(request, context)
        : await handler(request);

      // Log successful response
      const duration = Date.now() - startTime;
      logger.apiRequest(request.method, request.url, response.status, duration);
      
      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Enhanced error handling with proper logging
      const handledError = handleError(error, requestId, logger);
      const statusCode = ErrorHandler.getStatusCode(handledError);
      
      // Log error with full context
      logger.error('API request failed', handledError, {
        duration,
        statusCode,
        method: request.method,
        url: request.url,
      });

      // Format error response
      const errorResponse = ErrorHandler.formatErrorResponse(handledError, requestId);
      
      const response = NextResponse.json(errorResponse, { status: statusCode });
      response.headers.set('x-request-id', requestId);
      
      return response;
    }
  };
}

// Enhanced error processing with database error handling
export function handleError(error: unknown, requestId?: string, logger?: any): AppError {
  // Already an AppError - return as is
  if (error instanceof AppError) {
    return error;
  }

  // Prisma database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, requestId);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    logger?.error('Unknown Prisma error', error);
    return new AppError(
      'Database operation failed',
      ErrorCode.DATABASE_QUERY_ERROR,
      500,
      true,
      { prismaError: error.message },
      requestId
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger?.error('Prisma validation error', error);
    return new AppError(
      'Database validation failed',
      ErrorCode.VALIDATION_ERROR,
      400,
      true,
      { validationError: error.message },
      requestId
    );
  }

  // Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any;
    const issues = zodError.issues || [];
    const message = issues.map((issue: any) => 
      `${issue.path.join('.')}: ${issue.message}`
    ).join(', ');
    
    return new AppError(
      `Validation failed: ${message}`,
      ErrorCode.VALIDATION_ERROR,
      400,
      true,
      { validationIssues: issues },
      requestId
    );
  }

  // Next.js specific errors
  if (error instanceof Error) {
    // Check for common Next.js patterns
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return new AppError(
        'External service unavailable',
        ErrorCode.INTERNAL_SERVER_ERROR,
        503,
        true,
        { originalError: error.message },
        requestId
      );
    }

    if (error.message.includes('JSON') && error.message.includes('parse')) {
      return new AppError(
        'Invalid JSON in request body',
        ErrorCode.BAD_REQUEST,
        400,
        true,
        { parseError: error.message },
        requestId
      );
    }

    // Rate limiting errors (if using external rate limiter)
    if (error.message.includes('rate limit') || error.message.includes('Too Many Requests')) {
      return new AppError(
        error.message,
        ErrorCode.TOO_MANY_REQUESTS,
        429,
        true,
        undefined,
        requestId
      );
    }
  }

  // Generic error fallback
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return new AppError(
    isProduction ? 'Internal server error' : message,
    ErrorCode.INTERNAL_SERVER_ERROR,
    500,
    false, // Mark as non-operational for unknown errors
    {
      originalError: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error)
    },
    requestId
  );
}

// Specific Prisma error handler
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, requestId?: string): AppError {
  const { code, message, meta } = error;

  switch (code) {
    case 'P2002': // Unique constraint violation
      return new AppError(
        'A record with this information already exists',
        ErrorCode.DUPLICATE_ENTRY,
        409,
        true,
        { 
          constraint: meta?.target,
          prismaCode: code 
        },
        requestId
      );

    case 'P2003': // Foreign key constraint violation
      return new AppError(
        'Referenced record does not exist',
        ErrorCode.FOREIGN_KEY_CONSTRAINT,
        400,
        true,
        { 
          field: meta?.field_name,
          prismaCode: code 
        },
        requestId
      );

    case 'P2025': // Record not found
      return new AppError(
        'Record not found',
        ErrorCode.NOT_FOUND,
        404,
        true,
        { prismaCode: code },
        requestId
      );

    case 'P2034': // Transaction failed due to write conflict
      return new AppError(
        'Operation failed due to concurrent modification',
        ErrorCode.CONFLICT,
        409,
        true,
        { prismaCode: code },
        requestId
      );

    case 'P1008': // Operations timed out
      return new AppError(
        'Database operation timed out',
        ErrorCode.DATABASE_QUERY_ERROR,
        504,
        true,
        { prismaCode: code },
        requestId
      );

    case 'P1001': // Cannot reach database server
    case 'P1002': // Database server unreachable
      return new AppError(
        'Database connection failed',
        ErrorCode.DATABASE_CONNECTION_ERROR,
        503,
        true,
        { prismaCode: code },
        requestId
      );

    default:
      return new AppError(
        'Database operation failed',
        ErrorCode.DATABASE_QUERY_ERROR,
        500,
        true,
        { 
          prismaCode: code,
          prismaMessage: message,
          prismaMeta: meta 
        },
        requestId
      );
  }
}

// Async error handler for promise rejections
export function handleAsyncError(fn: Function) {
  return (req: NextRequest, res: NextResponse, next?: Function) => {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
    return result;
  };
}

// Error boundary for critical operations
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  errorContext: string,
  logger?: any,
  requestId?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const enhancedError = handleError(error, requestId, logger);
    
    if (logger) {
      logger.error(`Error in ${errorContext}`, enhancedError, {
        context: errorContext,
        operationFailed: true,
      });
    }
    
    throw enhancedError;
  }
}

// Process-level error handlers - FIXED to prevent multiple listeners
let globalErrorHandlersSetup = false;

export function setupGlobalErrorHandlers() {
  if (globalErrorHandlersSetup) {
    console.log('Global error handlers already setup, skipping...');
    return;
  }

  console.log('Setting up global error handlers...');
  
  const logger = createLogger({ requestId: 'global' });

  // Set higher max listeners to prevent warnings during development
  process.setMaxListeners(20);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception - shutting down gracefully', error, {
      type: 'uncaught_exception',
      fatal: true,
    });
    
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled promise rejection', reason, {
      type: 'unhandled_rejection',
      promise: promise.toString(),
    });
    
    // Don't exit the process for unhandled rejections in production
    // unless it's a critical error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // Handle termination signals - FIXED: Only set once
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal} - starting graceful shutdown`, {
      type: 'shutdown',
      signal,
    });
    
    // Perform cleanup operations
    setTimeout(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }, 5000); // Give 5 seconds for cleanup
  };

  // Check if listeners are already registered
  const sigtermListeners = process.listenerCount('SIGTERM');
  const sigintListeners = process.listenerCount('SIGINT');
  
  console.log(`Current SIGTERM listeners: ${sigtermListeners}, SIGINT listeners: ${sigintListeners}`);

  if (sigtermListeners === 0) {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    console.log('SIGTERM listener added');
  }
  
  if (sigintListeners === 0) {
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    console.log('SIGINT listener added');
  }

  globalErrorHandlersSetup = true;
  console.log('Global error handlers setup completed');
}