// app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { applicationMetrics, prometheusExporter } from '@/lib/metrics';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma-optimized;

async function metricsHandler(request: NextRequest) {
  const logger = createLogger({ requestId: 'metrics-api' });
  
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has metrics access (admin or researcher)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user || !['admin', 'researcher'].includes(user.role.name)) {
      logger.securityEvent('metrics_access_denied', 'medium', {
        userId: session.user.id,
        userRole: user?.role.name,
      });
      
      return NextResponse.json(
        { error: 'Insufficient permissions to access metrics' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const windowMinutes = parseInt(searchParams.get('window') || '5');
    const category = searchParams.get('category'); // http, database, genomics, etc.

    // Validate parameters
    if (windowMinutes < 1 || windowMinutes > 60) {
      return NextResponse.json(
        { error: 'Window parameter must be between 1 and 60 minutes' },
        { status: 400 }
      );
    }

    logger.info('Metrics request', {
      userId: session.user.id,
      format,
      windowMinutes,
      category,
    });

    if (format === 'prometheus') {
      // Return Prometheus format
      const prometheusMetrics = prometheusExporter.export();
      
      const response = new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
      
      return addSecurityHeaders(response);
    }

    // Return JSON format
    const metrics = applicationMetrics.getApplicationMetrics(windowMinutes);
    
    // Filter by category if specified
    let filteredMetrics;
    if (category && metrics[category as keyof typeof metrics]) {
      filteredMetrics = { [category]: metrics[category as keyof typeof metrics] };
    } else {
      filteredMetrics = metrics;
    }

    // Add metadata
    const responseData = {
      timestamp: new Date().toISOString(),
      windowMinutes,
      category: category || 'all',
      metrics: filteredMetrics,
      system: {
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      }
    };

    const response = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error('Metrics API error', error instanceof Error ? error : new Error(String(error)));
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

export const GET = withRateLimit('api')(metricsHandler);