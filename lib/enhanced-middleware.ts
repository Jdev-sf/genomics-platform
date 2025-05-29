// lib/enhanced-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from './error-handler';
import { withRequestLogging } from './logging-middleware';
import { withMetrics } from './metrics';
import { withRateLimit, RateLimitType } from './rate-limit-simple';
import { addSecurityHeaders } from './validation';
import { createLogger, generateRequestId } from './logger';

// Comprehensive middleware stack
export function withFullMiddleware(
  handler: Function,
  options: {
    rateLimit?: RateLimitType;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    enableErrorHandling?: boolean;
    enableSecurity?: boolean;
  } = {}
) {
  const {
    rateLimit = 'api',
    enableMetrics = true,
    enableLogging = true,
    enableErrorHandling = true,
    enableSecurity = true,
  } = options;

  let enhancedHandler = handler;

  // Apply middleware in reverse order (last applied = first executed)
  
  // 1. Security headers (outermost)
  if (enableSecurity) {
    enhancedHandler = withSecurityHeaders(enhancedHandler);
  }

  // 2. Error handling
  if (enableErrorHandling) {
    enhancedHandler = withErrorHandler(enhancedHandler);
  }

  // 3. Metrics collection
  if (enableMetrics) {
    enhancedHandler = withMetrics(enhancedHandler);
  }

  // 4. Request logging
  if (enableLogging) {
    enhancedHandler = withRequestLogging(enhancedHandler);
  }

  // 5. Rate limiting (innermost, closest to handler)
  if (rateLimit) {
    enhancedHandler = withRateLimit(rateLimit)(enhancedHandler);
  }

  return enhancedHandler;
}

// Security headers middleware
function withSecurityHeaders(handler: Function) {
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const response = context 
      ? await handler(request, context)
      : await handler(request);
    
    return addSecurityHeaders(response);
  };
}

// Enhanced error boundary with metrics and logging
export function withEnhancedErrorBoundary(handler: Function, context?: string) {
  return async function(request: NextRequest, routeContext?: any): Promise<Response> {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });
    const startTime = Date.now();

    try {
      const response = routeContext 
        ? await handler(request, routeContext)
        : await handler(request);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error with enhanced context
      logger.error(`Error in ${context || 'handler'}`, error instanceof Error ? error : new Error(String(error)), {
        context,
        duration,
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
      });

      // Re-throw to be handled by error middleware
      throw error;
    }
  };
}

// Specialized middleware for different route types
export const apiMiddleware = (handler: Function) => 
  withFullMiddleware(handler, {
    rateLimit: 'api',
    enableMetrics: true,
    enableLogging: true,
    enableErrorHandling: true,
    enableSecurity: true,
  });

export const searchMiddleware = (handler: Function) => 
  withFullMiddleware(handler, {
    rateLimit: 'search',
    enableMetrics: true,
    enableLogging: true,
    enableErrorHandling: true,
    enableSecurity: true,
  });

export const importMiddleware = (handler: Function) => 
  withFullMiddleware(handler, {
    rateLimit: 'import',
    enableMetrics: true,
    enableLogging: true,
    enableErrorHandling: true,
    enableSecurity: true,
  });

export const exportMiddleware = (handler: Function) => 
  withFullMiddleware(handler, {
    rateLimit: 'export',
    enableMetrics: true,
    enableLogging: true,
    enableErrorHandling: true,
    enableSecurity: true,
  });

export const authMiddleware = (handler: Function) => 
  withFullMiddleware(handler, {
    rateLimit: 'auth',
    enableMetrics: true,
    enableLogging: true,
    enableErrorHandling: true,
    enableSecurity: true,
  });

// Genomics-specific middleware with enhanced logging
export function withGenomicsMiddleware(handler: Function) {
  return withFullMiddleware(async function(request: NextRequest, context?: any) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });
    const startTime = Date.now();

    try {
      const response = await handler(request, context);
      
      // Log genomics operation
      const duration = Date.now() - startTime;
      logger.genomicsOperation('API operation', {
        endpoint: new URL(request.url).pathname,
        method: request.method,
        duration,
        statusCode: response.status,
      });
      
      return response;
    } catch (error) {
      logger.error('Genomics operation failed', error instanceof Error ? error : new Error(String(error)), {
        endpoint: new URL(request.url).pathname,
        method: request.method,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  });
}

// Database operation middleware
export function withDatabaseMiddleware(
  handler: Function,
  operation: string,
  table?: string
) {
  return withFullMiddleware(async function(request: NextRequest, context?: any) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });
    const startTime = Date.now();

    try {
      const response = await handler(request, context);
      
      // Log database operation
      const duration = Date.now() - startTime;
      logger.info(`Database ${operation} completed`, {
        operation,
        table,
        duration,
        success: true,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Database ${operation} failed`, error instanceof Error ? error : new Error(String(error)), {
        operation,
        table,
        duration,
        success: false,
      });
      throw error;
    }
  });
}

// Performance monitoring middleware
export function withPerformanceMonitoring(
  handler: Function,
  slowThreshold: number = 2000
) {
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const logger = createLogger({ requestId });
    const startTime = Date.now();

    const response = context 
      ? await handler(request, context)
      : await handler(request);
    
    const duration = Date.now() - startTime;
    
    if (duration > slowThreshold) {
      logger.warn('Slow request detected', {
        type: 'performance_warning',
        url: request.url,
        method: request.method,
        duration,
        threshold: slowThreshold,
      });
    }
    
    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Request-ID', requestId);
    
    return response;
  };
}

// Request context middleware (adds request ID and timing)
export function withRequestContext(handler: Function) {
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const requestId = generateRequestId();
    
    // Create new request with ID header
    const enhancedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: new Headers([
        ...Array.from(request.headers.entries()),
        ['x-request-id', requestId],
        ['x-request-start', Date.now().toString()],
      ]),
      body: request.body,
    });

    return context 
      ? await handler(enhancedRequest, context)
      : await handler(enhancedRequest);
  };
}

// Convenience function to apply all monitoring middleware
export function withMonitoring(handler: Function, options?: {
  slowThreshold?: number;
  context?: string;
}) {
  let enhancedHandler = handler;
  
  // Apply monitoring stack
  enhancedHandler = withPerformanceMonitoring(enhancedHandler, options?.slowThreshold);
  enhancedHandler = withEnhancedErrorBoundary(enhancedHandler, options?.context);
  enhancedHandler = withRequestContext(enhancedHandler);
  
  return enhancedHandler;
}

export default withFullMiddleware;