// lib/logging-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createLogger, createRequestContext, generateRequestId } from './logger';
import { auth } from './auth';

interface RequestLogData {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  contentLength?: number;
  query?: Record<string, string>;
  duration?: number;
  statusCode?: number;
  error?: any;
}

// Main logging middleware
export function withRequestLogging(handler: Function) {
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    
    // Extract request information
    const requestData: RequestLogData = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request),
      contentLength: request.headers.get('content-length') 
        ? parseInt(request.headers.get('content-length')!) 
        : undefined,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    };

    // Get user context if available
    try {
      const session = await auth();
      if (session?.user?.id) {
        requestData.userId = session.user.id;
      }
    } catch (error) {
      // Silent fail for auth context
    }

    // Create context-aware logger
    const requestContext = createRequestContext(requestId, {
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url,
    }, requestData.userId);
    
    const logger = createLogger(requestContext);

    // Log incoming request
    logger.http('Incoming request', {
      ...requestData,
      type: 'request_start',
    });

    let response: Response;
    let error: any = null;

    try {
      // Execute the handler
      response = context 
        ? await handler(request, context)
        : await handler(request);
      
      requestData.statusCode = response.status;

    } catch (caughtError) {
      error = caughtError;
      requestData.error = {
        name: error?.name,
        message: error?.message,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      };
      
      // Re-throw to be handled by error middleware
      throw error;
      
    } finally {
      // Calculate request duration
      requestData.duration = Date.now() - startTime;

      // Log request completion
      if (error) {
        logger.error('Request failed', error, {
          ...requestData,
          type: 'request_error',
        });
      } else {
        const logLevel = getLogLevel(requestData.statusCode || 500);
        logger[logLevel]('Request completed', {
          ...requestData,
          type: 'request_complete',
        });
      }

      // Log performance warning for slow requests
      if (requestData.duration > 5000) { // 5 seconds
        logger.warn('Slow request detected', {
          ...requestData,
          type: 'performance_warning',
          threshold: 5000,
        });
      }

      // Add request ID and timing headers to response
      if (response!) {
        response.headers.set('x-request-id', requestId);
        response.headers.set('x-response-time', `${requestData.duration}ms`);
      }
    }

    return response!;
  };
}

// Specialized logging for different types of operations
export function withDatabaseLogging(handler: Function) {
  return withRequestLogging(async function(request: NextRequest, context?: any) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });

    return await handler(request, context, logger);
  });
}

export function withImportLogging(handler: Function) {
  return withRequestLogging(async function(request: NextRequest, context?: any) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (file) {
      logger.importActivity(file.name, 'started', {
        fileSize: file.size,
        fileType: file.type,
      });
    }

    try {
      const response = await handler(request, context, logger);
      
      if (file) {
        logger.importActivity(file.name, 'completed', {
          statusCode: response.status,
        });
      }
      
      return response;
    } catch (error) {
      if (file) {
        logger.importActivity(file.name, 'failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  });
}

// Security event logging
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high',
  request: NextRequest,
  additionalData?: Record<string, any>
) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const logger = createLogger({ requestId });

  logger.securityEvent(event, severity, {
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    url: request.url,
    method: request.method,
    ...additionalData,
  });
}

// Rate limit logging
export function logRateLimit(
  request: NextRequest,
  limit: number,
  remaining: number,
  resetTime: number
) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const logger = createLogger({ requestId });

  logger.warn('Rate limit approached', {
    type: 'rate_limit_warning',
    limit,
    remaining,
    resetTime,
    ip: getClientIP(request),
    endpoint: request.url,
  });
}

// Database operation logging
export function createDatabaseLogger(requestId?: string) {
  const logger = createLogger({ requestId: requestId || generateRequestId() });
  
  return {
    logQuery: (operation: string, table: string, duration: number, query?: string) => {
      logger.dbQuery(query || `${operation} on ${table}`, duration, {
        operation,
        table,
        type: 'database_operation',
      });
    },
    
    logTransaction: (operation: string, tables: string[], duration: number) => {
      logger.info(`Database transaction: ${operation}`, {
        type: 'database_transaction',
        operation,
        tables,
        duration,
      });
    },
    
    logConnectionError: (error: Error) => {
      logger.error('Database connection error', error, {
        type: 'database_connection_error',
      });
    },
  };
}

// Genomics-specific logging
export function createGenomicsLogger(requestId?: string) {
  const logger = createLogger({ requestId: requestId || generateRequestId() });
  
  return {
    logGeneQuery: (geneId: string, operation: string, duration: number) => {
      logger.genomicsOperation(`Gene ${operation}`, {
        geneId,
        operation,
        duration,
        entity: 'gene',
      });
    },
    
    logVariantQuery: (variantId: string, operation: string, duration: number) => {
      logger.genomicsOperation(`Variant ${operation}`, {
        variantId,
        operation,
        duration,
        entity: 'variant',
      });
    },
    
    logVCFProcessing: (fileName: string, recordCount: number, duration: number) => {
      logger.genomicsOperation('VCF processing', {
        fileName,
        recordCount,
        duration,
        operation: 'vcf_parse',
      });
    },
    
    logAnnotationUpdate: (variantId: string, source: string, annotationCount: number) => {
      logger.genomicsOperation('Annotation update', {
        variantId,
        source,
        annotationCount,
        operation: 'annotation_update',
      });
    },
  };
}

// Utility functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || '127.0.0.1';
}

function getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

// Request/Response body logging (use with caution for sensitive data)
export function withBodyLogging(handler: Function, options: {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
} = {}) {
  const { logRequestBody = false, logResponseBody = false, maxBodySize = 1024 } = options;
  
  return withRequestLogging(async function(request: NextRequest, context?: any) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });

    let requestBody: any;
    if (logRequestBody && request.body) {
      try {
        const body = await request.text();
        requestBody = body.length <= maxBodySize 
          ? body 
          : `${body.substring(0, maxBodySize)}... (truncated)`;
        
        logger.debug('Request body logged', {
          type: 'request_body',
          bodySize: body.length,
          truncated: body.length > maxBodySize,
        });
        
        // Recreate request with body for handler
        request = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: body,
        });
      } catch (error) {
        logger.warn('Failed to log request body', { error });
      }
    }

    const response = await handler(request, context);

    if (logResponseBody && response.body) {
      try {
        const responseText = await response.text();
        const loggedBody = responseText.length <= maxBodySize
          ? responseText
          : `${responseText.substring(0, maxBodySize)}... (truncated)`;
        
        logger.debug('Response body logged', {
          type: 'response_body',
          bodySize: responseText.length,
          truncated: responseText.length > maxBodySize,
        });
        
        // Recreate response with body
        return new NextResponse(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error) {
        logger.warn('Failed to log response body', { error });
      }
    }

    return response;
  });
}

export default withRequestLogging;