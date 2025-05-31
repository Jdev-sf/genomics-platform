// lib/container/optimized-service-registry.ts
import { Container } from './container';
import { GeneRepository } from '@/lib/repositories/gene-repository';
import { VariantRepository } from '@/lib/repositories/variant-repository';
import { OptimizedGeneRepository } from '@/lib/repositories/optimized-gene-repository';
import { OptimizedVariantRepository } from '@/lib/repositories/optimized-variant-repository';
import { CachedGeneRepository } from '@/lib/repositories/cached-gene-repository';
import { CachedVariantRepository } from '@/lib/repositories/cached-variant-repository';
import { GeneService } from '@/lib/services/gene-service';
import { VariantService } from '@/lib/services/variant-service';
import { QueryPerformanceMonitor } from '@/lib/performance/query-monitor';
import { PaginationParams, PaginationResult } from '@/lib/repositories/base-repository';
import { GeneWhereInput, GeneWithStats } from '@/lib/repositories/gene-repository';
import { VariantWhereInput, VariantWithGene } from '@/lib/repositories/variant-repository';

// Enhanced service names with optimization layers
export const OPTIMIZED_SERVICE_NAMES = {
  // Base Repositories
  GENE_REPOSITORY: 'GeneRepository',
  VARIANT_REPOSITORY: 'VariantRepository',
  
  // Optimized Repositories (with query optimization)
  OPTIMIZED_GENE_REPOSITORY: 'OptimizedGeneRepository',
  OPTIMIZED_VARIANT_REPOSITORY: 'OptimizedVariantRepository',
  
  // Cached Repositories (optimized + caching)
  CACHED_GENE_REPOSITORY: 'CachedGeneRepository',
  CACHED_VARIANT_REPOSITORY: 'CachedVariantRepository',
  
  // Services
  GENE_SERVICE: 'GeneService',
  VARIANT_SERVICE: 'VariantService',
  
  // Performance Monitoring
  QUERY_MONITOR: 'QueryPerformanceMonitor',
} as const;

export type OptimizedServiceName = typeof OPTIMIZED_SERVICE_NAMES[keyof typeof OPTIMIZED_SERVICE_NAMES];

// Cached optimized repositories with proper typing
class CachedOptimizedGeneRepository extends CachedGeneRepository {
  private baseRepo: OptimizedGeneRepository;
  
  constructor() {
    super();
    this.baseRepo = new OptimizedGeneRepository();
  }

  // Override with proper typing
  override async findManyWithStats(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<GeneWithStats>> {
    const cacheKey = `gene:withStats:optimized:${JSON.stringify({ where, pagination })}`;
    
    try {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) return cached as PaginationResult<GeneWithStats>;

      const result = await this.baseRepo.findManyWithStats(where, pagination, requestId);
      await this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Cache error in optimized findManyWithStats', error instanceof Error ? error : new Error(String(error)));
      return this.baseRepo.findManyWithStats(where, pagination, requestId);
    }
  }

  async getGeneStatistics(requestId?: string) {
    const cacheKey = 'gene:statistics:optimized';
    
    try {
      const cached = await this.getCachedResult(cacheKey, 300); // 5 minutes TTL
      if (cached) return cached;

      const result = await this.baseRepo.getGeneStatistics(requestId);
      await this.setCachedResult(cacheKey, result, 300);
      return result;
    } catch (error) {
      return this.baseRepo.getGeneStatistics(requestId);
    }
  }

  async getTopPathogenicGenes(limit: number = 10, requestId?: string) {
    const cacheKey = `gene:topPathogenic:${limit}`;
    
    try {
      const cached = await this.getCachedResult(cacheKey, 600); // 10 minutes TTL
      if (cached) return cached;

      const result = await this.baseRepo.getTopPathogenicGenes(limit, requestId);
      await this.setCachedResult(cacheKey, result, 600);
      return result;
    } catch (error) {
      return this.baseRepo.getTopPathogenicGenes(limit, requestId);
    }
  }

  // Helper methods for caching
  private async getCachedResult(key: string, ttl?: number) {
    const { geneCache, CACHE_TTL } = await import('@/lib/cache/setup');
    const cached = await geneCache.get(key, { ttl: ttl || CACHE_TTL.GENE_LIST });
    return cached?.data;
  }

  private async setCachedResult(key: string, data: any, ttl?: number) {
    const { geneCache, CACHE_TTL } = await import('@/lib/cache/setup');
    await geneCache.set(key, data, { ttl: ttl || CACHE_TTL.GENE_LIST });
  }
}

class CachedOptimizedVariantRepository extends CachedVariantRepository {
  private baseRepo: OptimizedVariantRepository;
  
  constructor() {
    super();
    this.baseRepo = new OptimizedVariantRepository();
  }

  // Override with proper typing
  override async findManyWithGene(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    const cacheKey = `variant:withGene:optimized:${JSON.stringify({ where, pagination })}`;
    
    try {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) return cached as PaginationResult<VariantWithGene>;

      const result = await this.baseRepo.findManyWithGene(where, pagination, requestId);
      await this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Cache error in optimized findManyWithGene', error instanceof Error ? error : new Error(String(error)));
      return this.baseRepo.findManyWithGene(where, pagination, requestId);
    }
  }

  async findByGenomicRegion(
    region: any,
    filters?: any,
    pagination: PaginationParams = { page: 1, limit: 50 },
    requestId?: string
  ) {
    const cacheKey = `variant:genomicRegion:${JSON.stringify({ region, filters, pagination })}`;
    
    try {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) return cached;

      const result = await this.baseRepo.findByGenomicRegion(region, filters, pagination, requestId);
      await this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      return this.baseRepo.findByGenomicRegion(region, filters, pagination, requestId);
    }
  }

  async getClinicalStatistics(geneId?: string, requestId?: string) {
    const cacheKey = `variant:clinicalStats:${geneId || 'global'}`;
    
    try {
      const cached = await this.getCachedResult(cacheKey, 600); // 10 minutes TTL
      if (cached) return cached;

      const result = await this.baseRepo.getClinicalStatistics(geneId, requestId);
      await this.setCachedResult(cacheKey, result, 600);
      return result;
    } catch (error) {
      return this.baseRepo.getClinicalStatistics(geneId, requestId);
    }
  }

  private async getCachedResult(key: string, ttl?: number) {
    const { variantCache, CACHE_TTL } = await import('@/lib/cache/setup');
    const cached = await variantCache.get(key, { ttl: ttl || CACHE_TTL.VARIANT_LIST });
    return cached?.data;
  }

  private async setCachedResult(key: string, data: any, ttl?: number) {
    const { variantCache, CACHE_TTL } = await import('@/lib/cache/setup');
    await variantCache.set(key, data, { ttl: ttl || CACHE_TTL.VARIANT_LIST });
  }
}

/**
 * Register optimized services with performance monitoring
 */
export function registerOptimizedServices(container: Container): void {
  const performanceEnabled = process.env.QUERY_MONITORING !== 'false';
  const optimizationLevel = process.env.OPTIMIZATION_LEVEL || 'full'; // 'basic' | 'optimized' | 'full'
  
  // Register performance monitor
  container.singleton(OPTIMIZED_SERVICE_NAMES.QUERY_MONITOR, () => {
    const monitor = QueryPerformanceMonitor.getInstance();
    if (performanceEnabled) {
      monitor.startRealTimeMonitoring();
    }
    return monitor;
  });

  // Register repositories based on optimization level
  switch (optimizationLevel) {
    case 'basic':
      // Basic repositories without optimization
      container.singleton(OPTIMIZED_SERVICE_NAMES.GENE_REPOSITORY, () => new GeneRepository());
      container.singleton(OPTIMIZED_SERVICE_NAMES.VARIANT_REPOSITORY, () => new VariantRepository());
      break;
      
    case 'optimized':
      // Optimized repositories without caching
      container.singleton(OPTIMIZED_SERVICE_NAMES.OPTIMIZED_GENE_REPOSITORY, () => new OptimizedGeneRepository());
      container.singleton(OPTIMIZED_SERVICE_NAMES.OPTIMIZED_VARIANT_REPOSITORY, () => new OptimizedVariantRepository());
      break;
      
    case 'full':
    default:
      // Full optimization: optimized + cached
      container.singleton(OPTIMIZED_SERVICE_NAMES.CACHED_GENE_REPOSITORY, () => new CachedOptimizedGeneRepository());
      container.singleton(OPTIMIZED_SERVICE_NAMES.CACHED_VARIANT_REPOSITORY, () => new CachedOptimizedVariantRepository());
      break;
  }

  // Register services with dependency injection
  container.singleton(OPTIMIZED_SERVICE_NAMES.GENE_SERVICE, async () => {
    const geneRepository = await getOptimalGeneRepository(container, optimizationLevel);
    return new GeneService(geneRepository as any); // Type assertion for compatibility
  });

  container.singleton(OPTIMIZED_SERVICE_NAMES.VARIANT_SERVICE, async () => {
    const variantRepository = await getOptimalVariantRepository(container, optimizationLevel);
    return new VariantService(variantRepository as any); // Type assertion for compatibility
  });
}

// Helper functions to get optimal repository based on configuration
async function getOptimalGeneRepository(container: Container, level: string) {
  switch (level) {
    case 'basic':
      return container.resolve<GeneRepository>(OPTIMIZED_SERVICE_NAMES.GENE_REPOSITORY);
    case 'optimized':
      return container.resolve<OptimizedGeneRepository>(OPTIMIZED_SERVICE_NAMES.OPTIMIZED_GENE_REPOSITORY);
    case 'full':
    default:
      return container.resolve<CachedOptimizedGeneRepository>(OPTIMIZED_SERVICE_NAMES.CACHED_GENE_REPOSITORY);
  }
}

async function getOptimalVariantRepository(container: Container, level: string) {
  switch (level) {
    case 'basic':
      return container.resolve<VariantRepository>(OPTIMIZED_SERVICE_NAMES.VARIANT_REPOSITORY);
    case 'optimized':
      return container.resolve<OptimizedVariantRepository>(OPTIMIZED_SERVICE_NAMES.OPTIMIZED_VARIANT_REPOSITORY);
    case 'full':
    default:
      return container.resolve<CachedOptimizedVariantRepository>(OPTIMIZED_SERVICE_NAMES.CACHED_VARIANT_REPOSITORY);
  }
}

// Global optimized container instance
export const optimizedContainer = new Container();

// Register all optimized services on startup
registerOptimizedServices(optimizedContainer);

// Updated utility functions for optimized services
export async function getOptimizedGeneService(): Promise<GeneService> {
  return optimizedContainer.resolve<GeneService>(OPTIMIZED_SERVICE_NAMES.GENE_SERVICE);
}

export async function getOptimizedVariantService(): Promise<VariantService> {
  return optimizedContainer.resolve<VariantService>(OPTIMIZED_SERVICE_NAMES.VARIANT_SERVICE);
}

export async function getQueryMonitor(): Promise<QueryPerformanceMonitor> {
  return optimizedContainer.resolve<QueryPerformanceMonitor>(OPTIMIZED_SERVICE_NAMES.QUERY_MONITOR);
}

// Performance utilities
export class OptimizationManager {
  static async getPerformanceReport() {
    const monitor = await getQueryMonitor();
    return {
      queryReport: monitor.getPerformanceReport(60),
      slowQueries: monitor.getSlowQueriesReport(),
      recommendations: monitor.getOptimizationRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  static async warmupOptimizedCaches(): Promise<void> {
    try {
      const [geneService, variantService] = await Promise.all([
        getOptimizedGeneService(),
        getOptimizedVariantService(),
      ]);

      // Warmup with common queries
      await Promise.allSettled([
        geneService.searchGenes({ page: 1, limit: 20 }),
        geneService.searchGenes({ chromosome: '1', page: 1, limit: 10 }),
        variantService.searchVariants({ page: 1, limit: 20 }),
        variantService.searchVariants({ 
          clinicalSignificance: ['Pathogenic'], 
          page: 1, 
          limit: 10 
        }),
      ]);
    } catch (error) {
      console.error('Failed to warmup optimized caches:', error);
    }
  }
}

// Environment-based configuration
export const OptimizationConfig = {
  level: process.env.OPTIMIZATION_LEVEL || 'full',
  queryMonitoring: process.env.QUERY_MONITORING !== 'false',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  batchSize: parseInt(process.env.BATCH_SIZE || '500'),
} as const;