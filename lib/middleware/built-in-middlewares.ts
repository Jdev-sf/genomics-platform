// lib/middleware/built-in-middlewares.ts
import { NextRequest, NextResponse } from 'next/server';
import { MiddlewareHandler, MiddlewareContext } from './middleware-chain';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';
import { applicationMetrics } from '@/lib/metrics';
import { createLogger } from '@/lib/logger';

// Request ID Middleware
export const requestIdMiddleware: MiddlewareHandler = async (request, context) => {
  // Request ID is already set in context by the chain
  request.headers.set('x-request-id', context.requestId);
};

// Authentication Middleware
export const authMiddleware: MiddlewareHandler = async (request, context) => {
  try {
    const session = await auth();
    context.session = session;
    context.user = session?.user;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
};

// Rate Limiting Middleware
export const rateLimitMiddleware: MiddlewareHandler = async (request, context) => {
  const result = await checkRateLimit(request, 'api');
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }

  // Store rate limit info in context
  context.data.rateLimit = {
    limit: result.limit,
    remaining: result.remaining,
  };
};

// Security Headers Middleware
export const securityHeadersMiddleware: MiddlewareHandler = async (request, context) => {
  // This will be applied after the response is created
  context.data.addSecurityHeaders = true;
};

// Request Logging Middleware
export const requestLoggingMiddleware: MiddlewareHandler = async (request, context) => {
  const logger = createLogger({ requestId: context.requestId });
  
  logger.http('Incoming request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    userId: context.user?.id,
  });

  context.data.logger = logger;
};

// Metrics Collection Middleware
export const metricsMiddleware: MiddlewareHandler = async (request, context) => {
  context.data.metricsStart = Date.now();
  
  // This will be completed after the response
  context.data.collectMetrics = {
    method: request.method,
    path: new URL(request.url).pathname,
  };
};

// Validation Middleware Factory
export function createValidationMiddleware(schema: any): MiddlewareHandler {
  return async (request, context) => {
    try {
      let body;
      
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        body = await request.json();
        const validatedData = schema.parse(body);
        context.data.validatedBody = validatedData;
        
        // Recreate request with validated body
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(validatedData),
        });
        
        // Replace request in context (this is a limitation - we'd need to handle this differently)
        Object.assign(request, newRequest);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 }
      );
    }
  };
}

// Permission Check Middleware Factory
export function createPermissionMiddleware(requiredPermission: string): MiddlewareHandler {
  return async (request, context) => {
    if (!context.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userPermissions = context.user.role?.permissions || {};
    const hasPermission = Object.values(userPermissions).flat().includes(requiredPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  };
}

// Post-Response Middleware (for cleanup, logging, etc.)
export const postResponseMiddleware = (response: NextResponse, context: MiddlewareContext): NextResponse => {
  const logger = context.data.logger;
  const duration = Date.now() - context.startTime;

  // Add security headers if requested
  if (context.data.addSecurityHeaders) {
    addSecurityHeaders(response);
  }

  // Record metrics
  if (context.data.collectMetrics && context.data.metricsStart) {
    const metricsData = context.data.collectMetrics;
    const metricsDuration = Date.now() - context.data.metricsStart;
    
    applicationMetrics.recordApiRequest(
      metricsData.method,
      metricsData.path,
      response.status,
      metricsDuration
    );
  }

  // Log response
  if (logger) {
    logger.http('Request completed', {
      statusCode: response.status,
      duration,
      responseSize: response.headers.get('content-length'),
    });
  }

  // Add rate limit headers if available
  if (context.data.rateLimit) {
    response.headers.set('X-RateLimit-Limit', context.data.rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', context.data.rateLimit.remaining.toString());
  }

  return response;
};