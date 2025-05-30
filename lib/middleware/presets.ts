// lib/middleware/presets.ts
import { NextRequest, NextResponse } from 'next/server';
import { MiddlewareChain } from './middleware-chain';
import { addSecurityHeaders } from '@/lib/validation';
import {
  requestIdMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
  requestLoggingMiddleware,
  metricsMiddleware,
  createPermissionMiddleware,
  postResponseMiddleware,
} from './built-in-middlewares';

// API Routes Preset
export function createApiMiddlewareChain(): MiddlewareChain {
  const chain = new MiddlewareChain();

  chain.register(requestIdMiddleware, {
    name: 'RequestID',
    enabled: true,
    order: 1,
  });

  chain.register(requestLoggingMiddleware, {
    name: 'RequestLogging',
    enabled: true,
    order: 2,
  });

  chain.register(metricsMiddleware, {
    name: 'Metrics',
    enabled: true,
    order: 3,
  });

  chain.register(securityHeadersMiddleware, {
    name: 'SecurityHeaders',
    enabled: true,
    order: 4,
  });

  chain.register(rateLimitMiddleware, {
    name: 'RateLimit',
    enabled: true,
    order: 5,
  });

  chain.register(authMiddleware, {
    name: 'Authentication',
    enabled: true,
    order: 6,
  });

  return chain;
}

// Public API Preset (no auth required)
export function createPublicApiMiddlewareChain(): MiddlewareChain {
  const chain = new MiddlewareChain();

  chain.register(requestIdMiddleware, {
    name: 'RequestID',
    enabled: true,
    order: 1,
  });

  chain.register(requestLoggingMiddleware, {
    name: 'RequestLogging',
    enabled: true,
    order: 2,
  });

  chain.register(metricsMiddleware, {
    name: 'Metrics',
    enabled: true,
    order: 3,
  });

  chain.register(securityHeadersMiddleware, {
    name: 'SecurityHeaders',
    enabled: true,
    order: 4,
  });

  chain.register(rateLimitMiddleware, {
    name: 'RateLimit',
    enabled: true,
    order: 5,
  });

  return chain;
}

// Admin API Preset
export function createAdminApiMiddlewareChain(): MiddlewareChain {
  const chain = createApiMiddlewareChain();

  chain.register(createPermissionMiddleware('admin'), {
    name: 'AdminPermission',
    enabled: true,
    order: 7,
  });

  return chain;
}

// Utility function to create a middleware wrapper
export function withMiddlewareChain(
  chain: MiddlewareChain,
  handler: Function
) {
  return async function(request: NextRequest, context?: any): Promise<NextResponse> {
    try {
      const response = await chain.execute(request, handler, context);
      
      // The chain.execute already returns NextResponse, so we can use it directly
      return response;
      
    } catch (error) {
      // Error handling
      const errorResponse = NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
      
      return addSecurityHeaders(errorResponse);
    }
  };
}