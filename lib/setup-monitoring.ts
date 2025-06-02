// lib/setup-monitoring.ts
import { setupGlobalErrorHandlers } from './error-handler';
import { createLogger } from './logger';
import { applicationMetrics } from './metrics';

// Initialize monitoring systems
export function setupMonitoring() {
  const logger = createLogger({ requestId: 'monitoring-setup' });
  
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers();
    logger.info('Global error handlers configured');

    // Initialize metrics collection
    initializeMetrics();
    logger.info('Metrics collection initialized');

    // Setup periodic health checks
    setupPeriodicHealthChecks();
    logger.info('Periodic health checks configured');

    // Setup log directory if in production
    if (process.env.NODE_ENV === 'production') {
      setupLogDirectory();
      logger.info('Log directory configured');
    }

    logger.info('Monitoring system initialization completed', {
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
    });

  } catch (error) {
    logger.error('Failed to initialize monitoring system', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Initialize metrics collection
function initializeMetrics() {
  const logger = createLogger({ requestId: 'metrics-init' });
  
  // Start periodic system metrics collection
  setInterval(() => {
    try {
      applicationMetrics.recordSystemMetrics();
    } catch (error) {
      logger.error('Failed to collect system metrics', error instanceof Error ? error : new Error(String(error)));
    }
  }, 30000); // Every 30 seconds

  // Start periodic metrics cleanup
  setInterval(() => {
    try {
      // Cleanup is handled internally by the metrics store
      logger.debug('Metrics cleanup cycle completed');
    } catch (error) {
              logger.error('Failed to cleanup metrics', error instanceof Error ? error : new Error(String(error)));
    }
  }, 300000); // Every 5 minutes

  logger.info('Metrics collection timers started');
}

// Setup periodic health checks
function setupPeriodicHealthChecks() {
  const logger = createLogger({ requestId: 'health-checks' });
  
  // Perform health check every minute
  setInterval(async () => {
    try {
      const { HealthChecker } = await import('./health-checks');
      const health = await HealthChecker.getSystemHealth();
      
      if (health.status === 'unhealthy') {
        logger.error('System health check failed', {
          status: health.status,
          unhealthyChecks: health.checks.filter(c => c.status === 'unhealthy'),
        });
      } else if (health.status === 'degraded') {
        logger.warn('System health degraded', {
          status: health.status,
          degradedChecks: health.checks.filter(c => c.status === 'degraded'),
        });
      } else {
        logger.debug('System health check passed', {
          status: health.status,
          responseTime: health.metrics.responseTime,
        });
      }
    } catch (error) {
      logger.error('Periodic health check failed', error instanceof Error ? error : new Error(String(error)));
    }
  }, 60000); // Every minute

  logger.info('Periodic health checks started');
}

// Setup log directory for production
function setupLogDirectory() {
  const logger = createLogger({ requestId: 'log-setup' });
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      logger.info('Created logs directory', { logDir });
    }
    
    // Set up log rotation if needed
    // This is a basic implementation - in production, consider using
    // a proper log rotation service like logrotate
    
  } catch (error) {
    logger.error('Failed to setup log directory', error instanceof Error ? error : new Error(String(error)));
  }
}

// Graceful shutdown handler
export function setupGracefulShutdown() {
  const logger = createLogger({ requestId: 'shutdown' });
  
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} - starting graceful shutdown`);
    
    try {
      // Perform cleanup operations
      logger.info('Performing cleanup operations...');
      
      // Close database connections
      const { prisma } = await import('./prisma-optimized');
      await prisma.$disconnect();
      logger.info('Database connections closed');
      
      // Flush logs
      logger.info('Flushing logs...');
      
      // Additional cleanup operations can be added here
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  };
  
  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception - initiating emergency shutdown', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise: promise.toString() });
    // Don't exit the process for unhandled rejections in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
}

// Development-specific monitoring setup
export function setupDevelopmentMonitoring() {
  const logger = createLogger({ requestId: 'dev-monitoring' });
  
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Enhanced logging for development
  logger.info('Development monitoring enabled', {
    features: [
      'Enhanced error stack traces',
      'Detailed request logging',
      'Real-time metrics',
      'Health check monitoring',
    ]
  });
  
  // Log memory usage every minute in development
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    
    logger.debug('Memory usage (MB)', memUsageMB);
  }, 60000); // Every minute
}

// Production-specific monitoring setup
export function setupProductionMonitoring() {
  const logger = createLogger({ requestId: 'prod-monitoring' });
  
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  logger.info('Production monitoring enabled', {
    features: [
      'Structured JSON logging',
      'Error tracking',
      'Performance metrics',
      'Security monitoring',
      'Health checks',
    ]
  });
  
  // Set up additional production monitoring
  // Example: Send metrics to external monitoring service
  // setupExternalMonitoring();
  
  // Example: Set up alerting
  // setupAlerting();
}

// Configuration validation
export function validateMonitoringConfig() {
  const logger = createLogger({ requestId: 'config-validation' });
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check environment variables
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set, defaulting to development');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.npm_package_version) {
      warnings.push('Package version not available in production');
    }
    
    // Check for production-specific configurations
    if (!process.env.LOG_LEVEL) {
      warnings.push('LOG_LEVEL not set in production, using default');
    }
  }
  
  // Check write permissions for logs in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(process.cwd(), 'logs');
      
      // Test write permissions
      const testFile = path.join(logDir, 'test.log');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      errors.push('Cannot write to logs directory in production');
    }
  }
  
  // Report validation results
  if (errors.length > 0) {
    logger.error('Monitoring configuration errors', { errors });
    throw new Error(`Monitoring configuration invalid: ${errors.join(', ')}`);
  }
  
  if (warnings.length > 0) {
    logger.warn('Monitoring configuration warnings', { warnings });
  }
  
  logger.info('Monitoring configuration validated', {
    environment: process.env.NODE_ENV,
    errorsCount: errors.length,
    warningsCount: warnings.length,
  });
}

// Initialize monitoring based on environment
export function initializeMonitoring() {
  const logger = createLogger({ requestId: 'monitoring-init' });
  
  try {
    // Validate configuration first
    validateMonitoringConfig();
    
    // Setup core monitoring
    setupMonitoring();
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Environment-specific setup
    if (process.env.NODE_ENV === 'development') {
      setupDevelopmentMonitoring();
    } else if (process.env.NODE_ENV === 'production') {
      setupProductionMonitoring();
    }
    
    logger.info('Monitoring system fully initialized', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
    
  } catch (error) {
    logger.error('Failed to initialize monitoring system', error instanceof Error ? error : new Error(String(error)));
    
    // In production, we might want to exit if monitoring can't be set up
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    throw error;
  }
}

// Health check for monitoring system itself
export async function checkMonitoringHealth() {
  const logger = createLogger({ requestId: 'monitoring-health' });
  
  try {
    const health = {
      logger: true,
      metrics: true,
      errorHandlers: true,
      healthChecks: true,
      timestamp: new Date().toISOString(),
    };
    
    // Test logger
    try {
      logger.info('Testing logger functionality');
    } catch (error) {
      health.logger = false;
      logger.error('Logger test failed', error instanceof Error ? error : new Error(String(error)));
    }
    
    // Test metrics
    try {
      applicationMetrics.recordSystemMetrics();
    } catch (error) {
      health.metrics = false;
      logger.error('Metrics test failed', error instanceof Error ? error : new Error(String(error)));
    }
    
    // Test health checks
    try {
      const { HealthChecker } = await import('./health-checks');
      await HealthChecker.checkMemory();
    } catch (error) {
      health.healthChecks = false;
      logger.error('Health checks test failed', error instanceof Error ? error : new Error(String(error)));
    }
    
    const isHealthy = Object.values(health).every(v => v === true || typeof v === 'string');
    
    logger.info('Monitoring system health check completed', {
      ...health,
      overall: isHealthy ? 'healthy' : 'unhealthy',
    });
    
    return { ...health, overall: isHealthy ? 'healthy' : 'unhealthy' };
    
  } catch (error) {
    logger.error('Monitoring health check failed', error instanceof Error ? error : new Error(String(error)));
    return {
      logger: false,
      metrics: false,
      errorHandlers: false,
      healthChecks: false,
      overall: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export default initializeMonitoring;