// lib/repositories/base-repository.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma-optimized;
import { createLogger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/errors';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput = any> {
  protected prisma: PrismaClient;
  protected logger: ReturnType<typeof createLogger>;
  protected modelName: string;

  constructor(modelName: string) {
    this.prisma = prisma;
    this.logger = createLogger({ requestId: `${modelName}-repository` });
    this.modelName = modelName;
  }

  abstract create(data: CreateInput, requestId?: string): Promise<T>;
  abstract findById(id: string, requestId?: string): Promise<T | null>;
  abstract update(id: string, data: UpdateInput, requestId?: string): Promise<T>;
  abstract delete(id: string, requestId?: string): Promise<void>;
  abstract findMany(
    where?: WhereInput,
    pagination?: PaginationParams,
    requestId?: string
  ): Promise<PaginationResult<T>>;

  protected async executeWithErrorHandling<R>(
    operation: () => Promise<R>,
    operationName: string,
    context?: Record<string, any>,
    requestId?: string
  ): Promise<R> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Starting ${operationName}`, { 
        operation: operationName,
        context,
        requestId 
      });

      const result = await operation();
      
      const duration = Date.now() - startTime;
      this.logger.info(`${operationName} completed`, { 
        operation: operationName,
        duration,
        success: true,
        requestId 
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`${operationName} failed`, error instanceof Error ? error : new Error(String(error)), {
        operation: operationName,
        duration,
        context,
        requestId
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw this.handlePrismaError(error, operationName, requestId);
      }

      throw error instanceof AppError 
        ? error 
        : new AppError(
            `${operationName} failed`,
            ErrorCode.DATABASE_QUERY_ERROR,
            500,
            true,
            { originalError: error instanceof Error ? error.message : String(error) },
            requestId
          );
    }
  }

  protected buildPaginationMeta(
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T>['meta'] {
    const totalPages = Math.ceil(total / limit);
    
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  protected buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') {
    if (!sortBy) return undefined;
    return { [sortBy]: sortOrder };
  }

  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    operation: string,
    requestId?: string
  ): AppError {
    switch (error.code) {
      case 'P2002':
        return new AppError(
          `Duplicate ${this.modelName.toLowerCase()} found`,
          ErrorCode.DUPLICATE_ENTRY,
          409,
          true,
          { operation, constraint: error.meta?.target },
          requestId
        );
      case 'P2025':
        return new AppError(
          `${this.modelName} not found`,
          ErrorCode.NOT_FOUND,
          404,
          true,
          { operation },
          requestId
        );
      case 'P2003':
        return new AppError(
          `Invalid reference in ${this.modelName.toLowerCase()}`,
          ErrorCode.FOREIGN_KEY_CONSTRAINT,
          400,
          true,
          { operation, field: error.meta?.field_name },
          requestId
        );
      default:
        return new AppError(
          `Database operation failed: ${operation}`,
          ErrorCode.DATABASE_QUERY_ERROR,
          500,
          true,
          { operation, prismaCode: error.code },
          requestId
        );
    }
  }

  protected async withTransaction<R>(
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<R>,
    requestId?: string
  ): Promise<R> {
    return this.executeWithErrorHandling(
      () => this.prisma.$transaction(callback),
      'transaction',
      undefined,
      requestId
    );
  }
}