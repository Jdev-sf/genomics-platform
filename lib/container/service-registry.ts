// lib/container/service-registry.ts
import { Container } from './container';
import { GeneRepository } from '@/lib/repositories/gene-repository';
import { VariantRepository } from '@/lib/repositories/variant-repository';
import { GeneService } from '@/lib/services/gene-service';
import { VariantService } from '@/lib/services/variant-service';

// Service names constants
export const SERVICE_NAMES = {
  // Repositories
  GENE_REPOSITORY: 'GeneRepository',
  VARIANT_REPOSITORY: 'VariantRepository',
  
  // Services
  GENE_SERVICE: 'GeneService',
  VARIANT_SERVICE: 'VariantService',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

/**
 * Register all application services
 */
export function registerServices(container: Container): void {
  // Register repositories
  container.singleton(SERVICE_NAMES.GENE_REPOSITORY, () => new GeneRepository());
  container.singleton(SERVICE_NAMES.VARIANT_REPOSITORY, () => new VariantRepository());

  // Register services with dependency injection
  container.singleton(SERVICE_NAMES.GENE_SERVICE, async () => {
    const geneRepository = await container.resolve<GeneRepository>(SERVICE_NAMES.GENE_REPOSITORY);
    return new GeneService(geneRepository);
  });

  container.singleton(SERVICE_NAMES.VARIANT_SERVICE, async () => {
    const variantRepository = await container.resolve<VariantRepository>(SERVICE_NAMES.VARIANT_REPOSITORY);
    return new VariantService(variantRepository);
  });
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

export async function getGeneRepository(): Promise<GeneRepository> {
  return container.resolve<GeneRepository>(SERVICE_NAMES.GENE_REPOSITORY);
}

export async function getVariantRepository(): Promise<VariantRepository> {
  return container.resolve<VariantRepository>(SERVICE_NAMES.VARIANT_REPOSITORY);
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