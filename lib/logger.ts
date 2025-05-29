// lib/logger.ts
import winston from 'winston';
import { randomUUID } from 'crypto';

// Log levels
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const reqId = requestId ? `[${String(requestId).slice(0, 8)}]` : '';
    return `${timestamp} ${level} ${reqId} ${message} ${metaStr}`;
  })
);

// Create transports based on environment
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];

  if (process.env.NODE_ENV === 'production') {
    // Production: structured JSON logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: structuredFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: structuredFormat,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
      })
    );

    // Add console for container environments
    if (process.env.LOG_TO_CONSOLE !== 'false') {
      transports.push(
        new winston.transports.Console({
          format: structuredFormat,
          level: process.env.LOG_LEVEL || 'info',
        })
      );
    }
  } else {
    // Development: human-readable console logs
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug',
      })
    );
  }

  return transports;
};

// Base logger instance
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: createTransports(),
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
});

// Request context interface
export interface RequestContext {
  requestId: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  startTime?: number;
}

// Context-aware logger class
export class ContextLogger {
  private context: RequestContext;
  private baseLogger: winston.Logger;

  constructor(context: RequestContext, baseLogger: winston.Logger = logger) {
    this.context = context;
    this.baseLogger = baseLogger;
  }

  private log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    this.baseLogger.log(level, message, {
      ...meta,
      ...this.context,
      timestamp: new Date().toISOString(),
    });
  }

  error(message: string, error?: Error | Record<string, any>, meta: Record<string, any> = {}) {
    if (error instanceof Error) {
      this.log('error', message, {
        ...meta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.log('error', message, { ...meta, ...error });
    }
  }

  warn(message: string, meta: Record<string, any> = {}) {
    this.log('warn', message, meta);
  }

  info(message: string, meta: Record<string, any> = {}) {
    this.log('info', message, meta);
  }

  http(message: string, meta: Record<string, any> = {}) {
    this.log('http', message, meta);
  }

  debug(message: string, meta: Record<string, any> = {}) {
    this.log('debug', message, meta);
  }

  // Performance logging
  perf(operation: string, startTime: number, meta: Record<string, any> = {}) {
    const duration = Date.now() - startTime;
    this.info(`Performance: ${operation}`, {
      ...meta,
      operation,
      duration,
      performance: true,
    });
  }

  // Database query logging
  dbQuery(query: string, duration: number, meta: Record<string, any> = {}) {
    this.debug('Database query executed', {
      ...meta,
      query: query.substring(0, 200), // Truncate long queries
      duration,
      type: 'db_query',
    });
  }

  // API request/response logging
  apiRequest(method: string, url: string, statusCode?: number, duration?: number) {
    const message = `${method} ${url}`;
    const meta = {
      type: 'api_request',
      method,
      url,
      ...(statusCode && { statusCode }),
      ...(duration && { duration }),
    };

    if (statusCode && statusCode >= 400) {
      this.warn(message, meta);
    } else {
      this.http(message, meta);
    }
  }

  // Genomics-specific logging
  genomicsOperation(operation: string, meta: Record<string, any> = {}) {
    this.info(`Genomics operation: ${operation}`, {
      ...meta,
      type: 'genomics_operation',
      operation,
    });
  }

  importActivity(fileName: string, status: 'started' | 'completed' | 'failed', meta: Record<string, any> = {}) {
    const message = `Import ${status}: ${fileName}`;
    const logMeta = {
      ...meta,
      type: 'import_activity',
      fileName,
      status,
    };

    if (status === 'failed') {
      this.error(message, logMeta);
    } else {
      this.info(message, logMeta);
    }
  }

  // Security logging
  securityEvent(event: string, severity: 'low' | 'medium' | 'high', meta: Record<string, any> = {}) {
    const message = `Security event: ${event}`;
    const logMeta = {
      ...meta,
      type: 'security_event',
      event,
      severity,
    };

    if (severity === 'high') {
      this.error(message, logMeta);
    } else if (severity === 'medium') {
      this.warn(message, logMeta);
    } else {
      this.info(message, logMeta);
    }
  }
}

// Factory function to create context-aware loggers
export function createLogger(context: Partial<RequestContext> = {}): ContextLogger {
  const fullContext: RequestContext = {
    requestId: context.requestId || randomUUID(),
    ...context,
  };

  return new ContextLogger(fullContext);
}

// Utility functions
export function generateRequestId(): string {
  return randomUUID();
}

export function createRequestContext(
  requestId: string,
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
  },
  userId?: string
): RequestContext {
  const userAgent = req?.headers?.['user-agent'];
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  const realIp = req?.headers?.['x-real-ip'];
  
  return {
    requestId,
    userId,
    userAgent: Array.isArray(userAgent) 
      ? userAgent[0] 
      : userAgent,
    ip: Array.isArray(forwardedFor)
      ? forwardedFor[0]?.split(',')[0]
      : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]
      : Array.isArray(realIp)
      ? realIp[0]
      : realIp || '127.0.0.1',
    method: req?.method,
    url: req?.url,
    startTime: Date.now(),
  };
}

// Export the base logger for backward compatibility
export { logger };
export default createLogger;