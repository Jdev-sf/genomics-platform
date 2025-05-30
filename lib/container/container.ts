// lib/container/container.ts
import { createLogger } from '@/lib/logger';

export type ServiceFactory<T = any> = () => T | Promise<T>;
export type ServiceInstance<T = any> = T | Promise<T>;

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: ServiceInstance<T>;
}

export class Container {
  private services = new Map<string, ServiceDefinition>();
  private logger = createLogger({ requestId: 'container' });

  /**
   * Register a service with the container
   */
  register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    const { singleton = true } = options;

    this.services.set(name, {
      factory,
      singleton,
    });

    this.logger.debug(`Service registered: ${name}`, {
      singleton,
      type: 'service_registration',
    });
  }

  /**
   * Register a singleton service
   */
  singleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, { singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   */
  transient<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, { singleton: false });
  }

  /**
   * Register an existing instance as a singleton
   */
  instance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      singleton: true,
      instance,
    });

    this.logger.debug(`Instance registered: ${name}`, {
      type: 'instance_registration',
    });
  }

  /**
   * Resolve a service from the container
   */
  async resolve<T>(name: string): Promise<T> {
    const service = this.services.get(name);

    if (!service) {
      const error = new Error(`Service not found: ${name}`);
      this.logger.error('Service resolution failed', error, {
        serviceName: name,
        type: 'service_not_found',
      });
      throw error;
    }

    try {
      // Return existing instance for singletons
      if (service.singleton && service.instance) {
        return service.instance as T;
      }

      // Create new instance
      const startTime = Date.now();
      const instance = await service.factory();
      const duration = Date.now() - startTime;

      // Store instance for singletons
      if (service.singleton) {
        service.instance = instance;
      }

      this.logger.debug(`Service resolved: ${name}`, {
        serviceName: name,
        duration,
        singleton: service.singleton,
        type: 'service_resolved',
      });

      return instance as T;
    } catch (error) {
      this.logger.error(`Service resolution failed: ${name}`, error instanceof Error ? error : new Error(String(error)), {
        serviceName: name,
        type: 'service_resolution_error',
      });
      throw error;
    }
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.logger.debug('Container cleared', {
      type: 'container_cleared',
    });
  }

  /**
   * Create a scoped container (inherits parent services)
   */
  createScope(): Container {
    const scopedContainer = new Container();
    
    // Copy parent services
    for (const [name, service] of this.services) {
      scopedContainer.services.set(name, { ...service });
    }

    this.logger.debug('Scoped container created', {
      parentServices: this.services.size,
      type: 'scope_created',
    });

    return scopedContainer;
  }
}

