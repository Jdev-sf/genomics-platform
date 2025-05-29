// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { HealthChecker } from '@/lib/health-checks';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';

async function healthHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get comprehensive system health
    const systemHealth = await HealthChecker.getSystemHealth();
    
    // Determine HTTP status code based on health status
    let statusCode = 200;
    if (systemHealth.status === 'degraded') {
      statusCode = 200; // Still return 200 for degraded but include warning
    } else if (systemHealth.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    const response = NextResponse.json(systemHealth, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Health check endpoint failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      metrics: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage(),
      },
    };

    const response = NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });

    return addSecurityHeaders(response);
  }
}

// Apply light rate limiting for health checks
export const GET = withRateLimit('api')(healthHandler);