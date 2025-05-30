// lib/services/base-service.ts
import { createLogger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/errors';

export abstract class BaseService {
  protected logger: ReturnType<typeof createLogger>;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = createLogger({ requestId: `${serviceName}-service` });
  }

  protected async executeWithErrorHandling<R>(
    operation: () => Promise<R>,
    operationName: string,
    context?: Record<string, any>,
    requestId?: string
  ): Promise<R> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Starting ${operationName}`, { 
        service: this.serviceName,
        operation: operationName,
        context,
        requestId 
      });

      const result = await operation();
      
      const duration = Date.now() - startTime;
      this.logger.info(`${operationName} completed`, { 
        service: this.serviceName,
        operation: operationName,
        duration,
        success: true,
        requestId 
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`${operationName} failed`, error instanceof Error ? error : new Error(String(error)), {
        service: this.serviceName,
        operation: operationName,
        duration,
        context,
        requestId
      });

      throw error instanceof AppError 
        ? error 
        : new AppError(
            `Service operation failed: ${operationName}`,
            ErrorCode.INTERNAL_SERVER_ERROR,
            500,
            true,
            { 
              service: this.serviceName,
              operation: operationName,
              originalError: error instanceof Error ? error.message : String(error) 
            },
            requestId
          );
    }
  }
}

