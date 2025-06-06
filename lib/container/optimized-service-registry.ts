// lib/container/optimized-service-registry.ts
import { Container } from './container';
import { GeneRepository } from '@/lib/repositories/gene-repository';
import { VariantRepository } from '@/lib/repositories/variant-repository';
import { OptimizedGeneRepository } from '@/lib/repositories/optimized-gene-repository';
import { OptimizedVariantRepository } from '@/lib/repositories/optimized-variant-repository';
import { OptimizedCachedGeneRepository } from '@/lib/repositories/cached-gene-repository';
import { OptimizedCachedVariantRepository } from '@/lib/repositories/cached-variant-repository';
import { geneCache, variantCache } from '@/lib/cache/setup';
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

// Repository implementations now use optimized cached versions directly

// Cleaned up - using direct optimized cached implementations

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
      // Full optimization: optimized + cached with new implementation
      container.singleton(OPTIMIZED_SERVICE_NAMES.CACHED_GENE_REPOSITORY, async () => {
        const cache = await geneCache;
        return new OptimizedCachedGeneRepository(cache);
      });
      container.singleton(OPTIMIZED_SERVICE_NAMES.CACHED_VARIANT_REPOSITORY, async () => {
        const cache = await variantCache;
        return new OptimizedCachedVariantRepository(cache);
      });
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
      return container.resolve<OptimizedCachedGeneRepository>(OPTIMIZED_SERVICE_NAMES.CACHED_GENE_REPOSITORY);
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
      return container.resolve<OptimizedCachedVariantRepository>(OPTIMIZED_SERVICE_NAMES.CACHED_VARIANT_REPOSITORY);
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