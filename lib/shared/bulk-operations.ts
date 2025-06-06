// lib/shared/bulk-operations.ts
// Standardized bulk operation interfaces and utilities

export interface BulkError<T> {
  item: T;
  error: string;
  index: number;
}

export interface BulkMeta {
  totalItems: number;
  processingTime: number;
  batchSize: number;
  timestamp: Date;
}

export interface BulkOperationResult<T> {
  successful: number;
  failed: number;
  errors: BulkError<T>[];
  meta: BulkMeta;
}

export interface BulkOperationOptions {
  batchSize?: number;
  continueOnError?: boolean;
  validateBeforeProcess?: boolean;
  maxConcurrency?: number;
}

export class BulkOperationProcessor {
  
  /**
   * Process items in batches with error handling
   */
  static async processBulkOperation<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput>,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult<TInput>> {
    const {
      batchSize = 100,
      continueOnError = true,
      maxConcurrency = 5
    } = options;
    
    const startTime = Date.now();
    const result: BulkOperationResult<TInput> = {
      successful: 0,
      failed: 0,
      errors: [],
      meta: {
        totalItems: items.length,
        processingTime: 0,
        batchSize,
        timestamp: new Date()
      }
    };
    
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          await processor(item, globalIndex);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            item,
            error: error instanceof Error ? error.message : String(error),
            index: globalIndex
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
      });
      
      // Process batch with concurrency limit
      const semaphore = new Semaphore(maxConcurrency);
      await Promise.all(
        batchPromises.map(async (promise) => {
          await semaphore.acquire();
          try {
            await promise;
          } finally {
            semaphore.release();
          }
        })
      );
    }
    
    result.meta.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Validate items before processing
   */
  static validateBulkItems<T>(
    items: T[],
    validator: (item: T, index: number) => { valid: boolean; errors: string[] }
  ): { validItems: T[]; invalidItems: BulkError<T>[] } {
    const validItems: T[] = [];
    const invalidItems: BulkError<T>[] = [];
    
    items.forEach((item, index) => {
      const validation = validator(item, index);
      if (validation.valid) {
        validItems.push(item);
      } else {
        invalidItems.push({
          item,
          error: validation.errors.join(', '),
          index
        });
      }
    });
    
    return { validItems, invalidItems };
  }

  /**
   * Create summary from bulk operation result
   */
  static createBulkSummary<T>(result: BulkOperationResult<T>): string {
    const { successful, failed, meta } = result;
    const total = successful + failed;
    const successRate = total > 0 ? (successful / total * 100).toFixed(1) : '0';
    
    return `Bulk operation completed: ${successful}/${total} successful (${successRate}%), ` +
           `${failed} failed, processed in ${meta.processingTime}ms`;
  }

  /**
   * Get error summary from bulk operation result
   */
  static getErrorSummary<T>(result: BulkOperationResult<T>): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    result.errors.forEach(error => {
      const errorType = this.categorizeError(error.error);
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });
    
    return errorCounts;
  }

  private static categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Validation Error';
    }
    if (message.includes('duplicate') || message.includes('already exists')) {
      return 'Duplicate Error';
    }
    if (message.includes('not found')) {
      return 'Not Found Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network Error';
    }
    
    return 'Unknown Error';
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Utility functions for common bulk operations
 */
export class BulkOperationUtils {
  
  /**
   * Split array into chunks
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Calculate optimal batch size based on item size and memory constraints
   */
  static calculateOptimalBatchSize(
    itemSize: number,
    maxMemoryMB: number = 100
  ): number {
    const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    const batchSize = Math.floor(maxMemoryBytes / itemSize);
    
    // Ensure reasonable bounds
    return Math.max(1, Math.min(batchSize, 1000));
  }
}