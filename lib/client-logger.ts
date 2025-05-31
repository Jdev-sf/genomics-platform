// lib/client-logger.ts
'use client';

interface LogData {
  [key: string]: any;
}

class ClientLogger {
  private context: { requestId?: string } = {};

  constructor(context: { requestId?: string } = {}) {
    this.context = context;
  }

  private formatMessage(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: LogData) {
    const timestamp = new Date().toISOString();
    const prefix = this.context.requestId ? `[${this.context.requestId.slice(0, 8)}]` : '';
    
    if (data && Object.keys(data).length > 0) {
      // Fix: use proper console methods
      if (level === 'error') {
        console.error(`${timestamp} ERROR ${prefix} ${message}`, data);
      } else if (level === 'warn') {
        console.warn(`${timestamp} WARN ${prefix} ${message}`, data);
      } else if (level === 'debug') {
        console.debug(`${timestamp} DEBUG ${prefix} ${message}`, data);
      } else {
        console.log(`${timestamp} INFO ${prefix} ${message}`, data);
      }
    } else {
      if (level === 'error') {
        console.error(`${timestamp} ERROR ${prefix} ${message}`);
      } else if (level === 'warn') {
        console.warn(`${timestamp} WARN ${prefix} ${message}`);
      } else if (level === 'debug') {
        console.debug(`${timestamp} DEBUG ${prefix} ${message}`);
      } else {
        console.log(`${timestamp} INFO ${prefix} ${message}`);
      }
    }
  }

  info(message: string, data?: LogData) {
    this.formatMessage('info', message, data);
  }

  error(message: string, error?: Error | LogData, data?: LogData) {
    if (error instanceof Error) {
      this.formatMessage('error', message, { 
        error: error.message, 
        stack: error.stack,
        ...data 
      });
    } else {
      this.formatMessage('error', message, { ...error, ...data });
    }
  }

  warn(message: string, data?: LogData) {
    this.formatMessage('warn', message, data);
  }

  debug(message: string, data?: LogData) {
    if (process.env.NODE_ENV === 'development') {
      this.formatMessage('debug', message, data);
    }
  }
}

export function createClientLogger(context: { requestId?: string } = {}): ClientLogger {
  return new ClientLogger(context);
}