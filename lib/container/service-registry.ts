// lib/container/service-registry.ts - Complete version
import { Container } from './container';
import { GeneRepository } from '@/lib/repositories/gene-repository';
import { VariantRepository } from '@/lib/repositories/variant-repository';
import { CachedGeneRepository } from '@/lib/repositories/cached-gene-repository';
import { CachedVariantRepository } from '@/lib/repositories/cached-variant-repository';
import { GeneService } from '@/lib/services/gene-service';
import { VariantService } from '@/lib/services/variant-service';

// Service names constants
export const SERVICE_NAMES = {
  // Base Repositories
  GENE_REPOSITORY: 'GeneRepository',
  VARIANT_REPOSITORY: 'VariantRepository',
  
  // Cached Repositories  
  CACHED_GENE_REPOSITORY: 'CachedGeneRepository',
  CACHED_VARIANT_REPOSITORY: 'CachedVariantRepository',
  
  // Services
  GENE_SERVICE: 'GeneService',
  VARIANT_SERVICE: 'VariantService',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

/**
 * Register all application services with caching support
 */
export function registerServices(container: Container): void {
  const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
  
  // Register base repositories
  container.singleton(SERVICE_NAMES.GENE_REPOSITORY, () => new GeneRepository());
  container.singleton(SERVICE_NAMES.VARIANT_REPOSITORY, () => new VariantRepository());

  // Register cached repositories
  container.singleton(SERVICE_NAMES.CACHED_GENE_REPOSITORY, () => new CachedGeneRepository());
  container.singleton(SERVICE_NAMES.CACHED_VARIANT_REPOSITORY, () => new CachedVariantRepository());

  // Register services with dependency injection
  if (cacheEnabled) {
    // Use cached repositories in production - no type assertion needed with ReturnType
    container.singleton(SERVICE_NAMES.GENE_SERVICE, async () => {
      const geneRepository = await container.resolve<CachedGeneRepository>(SERVICE_NAMES.CACHED_GENE_REPOSITORY);
      return new GeneService(geneRepository);
    });

    container.singleton(SERVICE_NAMES.VARIANT_SERVICE, async () => {
      const variantRepository = await container.resolve<CachedVariantRepository>(SERVICE_NAMES.CACHED_VARIANT_REPOSITORY);
      return new VariantService(variantRepository);
    });
  } else {
    // Use base repositories without caching
    container.singleton(SERVICE_NAMES.GENE_SERVICE, async () => {
      const geneRepository = await container.resolve<GeneRepository>(SERVICE_NAMES.GENE_REPOSITORY);
      return new GeneService(geneRepository);
    });

    container.singleton(SERVICE_NAMES.VARIANT_SERVICE, async () => {
      const variantRepository = await container.resolve<VariantRepository>(SERVICE_NAMES.VARIANT_REPOSITORY);
      return new VariantService(variantRepository);
    });
  }
}

// Global container instance
export const container = new Container();

// Register all services on startup
registerServices(container);

// Utility functions for common service resolution
export async function getGeneService(): Promise<GeneService> {
  return container.resolve<GeneService>(SERVICE_NAMES.GENE_SERVICE);
}

export async function getVariantService(): Promise<VariantService> {
  return container.resolve<VariantService>(SERVICE_NAMES.VARIANT_SERVICE);
}

export async function getCachedGeneService(): Promise<GeneService> {
  return container.resolve<GeneService>(SERVICE_NAMES.GENE_SERVICE);
}

export async function getCachedVariantService(): Promise<VariantService> {
  return container.resolve<VariantService>(SERVICE_NAMES.VARIANT_SERVICE);
}

export async function getGeneRepository(): Promise<GeneRepository | CachedGeneRepository> {
  const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
  return container.resolve<GeneRepository>(
    cacheEnabled ? SERVICE_NAMES.CACHED_GENE_REPOSITORY : SERVICE_NAMES.GENE_REPOSITORY
  );
}

export async function getVariantRepository(): Promise<VariantRepository | CachedVariantRepository> {
  const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
  return container.resolve<VariantRepository>(
    cacheEnabled ? SERVICE_NAMES.CACHED_VARIANT_REPOSITORY : SERVICE_NAMES.VARIANT_REPOSITORY
  );
}

// Cache management utilities
export class ServiceCacheManager {
  static async warmupAllCaches(): Promise<void> {
    try {
      const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
      if (!cacheEnabled) return;

      const [geneRepo, variantRepo] = await Promise.all([
        container.resolve<CachedGeneRepository>(SERVICE_NAMES.CACHED_GENE_REPOSITORY),
        container.resolve<CachedVariantRepository>(SERVICE_NAMES.CACHED_VARIANT_REPOSITORY),
      ]);

      await Promise.allSettled([
        geneRepo.warmupPopularGenes(),
        // variantRepo warmup methods would go here
      ]);
    } catch (error) {
      console.error('Failed to warmup service caches:', error);
    }
  }

  static async invalidateAllCaches(): Promise<void> {
    try {
      const { CacheUtils } = await import('@/lib/cache/setup');
      await CacheUtils.clearAllCaches();
    } catch (error) {
      console.error('Failed to invalidate service caches:', error);
    }
  }

  static async getCacheStatistics() {
    try {
      const { CacheUtils } = await import('@/lib/cache/setup');
      return CacheUtils.getCacheStats();
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return null;
    }
  }
}

// Service decorator for automatic dependency injection
export function Injectable(serviceName: ServiceName) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    container.register(serviceName, () => new constructor());
    return constructor;
  };
}

// Method decorator for service injection
export function Inject(serviceName: ServiceName) {
  return function (target: any, propertyKey: string | symbol) {
    Object.defineProperty(target, propertyKey, {
      get: async function() {
        return await container.resolve(serviceName);
      },
      configurable: true,
      enumerable: true,
    });
  };
}