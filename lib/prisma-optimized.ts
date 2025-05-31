// lib/prisma-optimized.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'prisma-pool' });

// Database URL with connection pooling
const getDatabaseUrl = (): string => {
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Add connection pooling parameters if not present
  const url = new URL(databaseUrl);
  
  // Connection pool parameters
  const poolParams = {
    'connection_limit': process.env.DB_CONNECTION_LIMIT || '20',
    'pool_timeout': process.env.DB_POOL_TIMEOUT || '60',
    'connect_timeout': process.env.DB_CONNECT_TIMEOUT || '10',
    'statement_cache_size': '100',
    'prepared_statement_cache_size': '100',
  };

  // Add parameters if not already present
  Object.entries(poolParams).forEach(([key, value]) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

// Enhanced Prisma client with monitoring
class EnhancedPrismaClient extends PrismaClient {
  private connectionCount = 0;
  private queryCount = 0;
  private slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    super({
      datasources: {
        db: {
          url: getDatabaseUrl(),
        },
      },
      log: isProduction 
        ? ['error', 'warn']
        : [
            { level: 'query', emit: 'event' },
            'error',
            'warn', 
            'info',
          ],
    });

    this.setupEventListeners();
    this.setupQueryLogging();
  }

  private setupEventListeners() {
    // Cast this to any to access event methods
    const client = this as any;

    // Error handling
    try {
      client.$on('error', (e: any) => {
        logger.error('Prisma error', e);
      });
    } catch (error) {
      // Ignore if event not supported
    }

    // Warning handling  
    try {
      client.$on('warn', (e: any) => {
        logger.warn('Prisma warning', e);
      });
    } catch (error) {
      // Ignore if event not supported
    }
  }

  private setupQueryLogging() {
    if (process.env.NODE_ENV !== 'production') {
      // Cast this to any to access event methods
      const client = this as any;
      
      try {
        client.$on('query', (e: any) => {
          this.queryCount++;
          
          const duration = parseInt(e.duration);
          const query = e.query.substring(0, 100); // Truncate long queries
          
          if (duration > this.slowQueryThreshold) {
            logger.warn('Slow query detected', {
              query,
              duration,
              params: e.params,
              target: e.target,
            });
          } else {
            logger.debug('Query executed', {
              query,
              duration,
              target: e.target,
            });
          }
        });
      } catch (error) {
        logger.warn('Query logging not available in this Prisma version');
      }
    }
  }

  // Enhanced connect with retry logic
  async connectWithRetry(maxRetries = 3, delay = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.connectionCount++;
        logger.info('Prisma connected successfully', { 
          attempt,
          connectionCount: this.connectionCount 
        });
        return;
      } catch (error) {
        logger.error(`Connection attempt ${attempt} failed`, error instanceof Error ? error : new Error(String(error)));
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        logger.info(`Retrying connection in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Enhanced disconnect
  async disconnectGracefully(): Promise<void> {
    try {
      logger.info('Gracefully disconnecting Prisma client', {
        totalQueries: this.queryCount,
        connectionCount: this.connectionCount,
      });
      await this.$disconnect();
    } catch (error) {
      logger.error('Error during graceful disconnect', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Connection health check
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Get connection statistics
  getStats() {
    return {
      queryCount: this.queryCount,
      connectionCount: this.connectionCount,
      slowQueryThreshold: this.slowQueryThreshold,
    };
  }

  // Batch operations helper
  async batchExecute<T>(
    operations: (() => Promise<T>)[],
    batchSize = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the DB
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  // Transaction wrapper with retry
  async transactionWithRetry<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: options?.maxWait || 5000,
          timeout: options?.timeout || 10000,
          isolationLevel: options?.isolationLevel,
        });
      } catch (error) {
        logger.warn(`Transaction attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries,
        });
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
    
    throw new Error('Transaction failed after maximum retries');
  }
}

// Global instance management
const globalForPrisma = globalThis as unknown as {
  prisma: EnhancedPrismaClient | undefined;
  shutdownHandlersSetup?: boolean;
};

export const prisma = globalForPrisma.prisma ?? new EnhancedPrismaClient();

// Initialize connection in production
if (process.env.NODE_ENV === 'production') {
  prisma.connectWithRetry().catch((error) => {
    logger.error('Failed to connect to database', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Setup graceful shutdown handlers only once globally
if (!globalForPrisma.shutdownHandlersSetup) {
  globalForPrisma.shutdownHandlersSetup = true;
  
  // Increase max listeners to prevent warnings
  process.setMaxListeners(30);
  
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, disconnecting Prisma...`);
    try {
      await prisma.disconnectGracefully();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  };

  // Only add listeners once
  const existingListeners = process.listenerCount('SIGINT');
  if (existingListeners === 0) {
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions (only in production)
    if (process.env.NODE_ENV === 'production') {
      process.on('uncaughtException', async (error) => {
        logger.error('Uncaught exception', error);
        await prisma.disconnectGracefully();
        process.exit(1);
      });

      process.on('unhandledRejection', async (reason, promise) => {
        logger.error('Unhandled rejection', { reason, promise });
        await prisma.disconnectGracefully();
        process.exit(1);
      });
    }
  }
}

export default prisma;