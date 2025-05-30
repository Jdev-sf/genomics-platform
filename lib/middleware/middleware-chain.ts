// lib/middleware/middleware-chain.ts
import { NextRequest, NextResponse } from 'next/server';
import { createLogger, generateRequestId } from '@/lib/logger';

export type MiddlewareHandler = (
  request: NextRequest,
  context: MiddlewareContext
) => Promise<NextResponse | void>;

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  data: Record<string, any>;
  user?: any;
  session?: any;
}

export interface MiddlewareConfig {
  name: string;
  enabled: boolean;
  order: number;
  skipOn?: (request: NextRequest) => boolean;
}

export class MiddlewareChain {
  private middlewares: Array<{
    handler: MiddlewareHandler;
    config: MiddlewareConfig;
  }> = [];
  private logger = createLogger({ requestId: 'middleware-chain' });

  register(handler: MiddlewareHandler, config: MiddlewareConfig): void {
    this.middlewares.push({ handler, config });
    
    // Sort by order
    this.middlewares.sort((a, b) => a.config.order - b.config.order);
    
    this.logger.debug(`Middleware registered: ${config.name}`, {
      name: config.name,
      order: config.order,
      enabled: config.enabled,
    });
  }

  async execute(request: NextRequest, finalHandler: Function, routeContext?: any): Promise<NextResponse> {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const startTime = Date.now();
    
    const context: MiddlewareContext = {
      requestId,
      startTime,
      data: {},
    };

    this.logger.debug('Middleware chain execution started', {
      requestId,
      url: request.url,
      method: request.method,
      middlewareCount: this.middlewares.filter(m => m.config.enabled).length,
    });

    try {
      // Execute middlewares in order
      for (const { handler, config } of this.middlewares) {
        if (!config.enabled) {
          continue;
        }

        // Check if middleware should be skipped
        if (config.skipOn && config.skipOn(request)) {
          this.logger.debug(`Middleware skipped: ${config.name}`, {
            requestId,
            middleware: config.name,
          });
          continue;
        }

        const middlewareStart = Date.now();
        this.logger.debug(`Executing middleware: ${config.name}`, {
          requestId,
          middleware: config.name,
        });

        try {
          const result = await handler(request, context);
          
          const middlewareDuration = Date.now() - middlewareStart;
          this.logger.debug(`Middleware completed: ${config.name}`, {
            requestId,
            middleware: config.name,
            duration: middlewareDuration,
          });

          // If middleware returns a response, stop chain execution
          if (result instanceof NextResponse) {
            this.logger.info('Middleware chain stopped early', {
              requestId,
              stoppedBy: config.name,
              totalDuration: Date.now() - startTime,
            });
            return result;
          }

        } catch (error) {
          const middlewareDuration = Date.now() - middlewareStart;
          this.logger.error(`Middleware failed: ${config.name}`, error instanceof Error ? error : new Error(String(error)), {
            requestId,
            middleware: config.name,
            duration: middlewareDuration,
          });
          throw error;
        }
      }

      // Execute final handler
      this.logger.debug('Executing final handler', { requestId });
      const handlerStart = Date.now();
      
      const handlerResponse = routeContext 
        ? await finalHandler(request, routeContext)
        : await finalHandler(request);
      
      const handlerDuration = Date.now() - handlerStart;
      const totalDuration = Date.now() - startTime;

      // Ensure we always return NextResponse
      let nextResponse: NextResponse;
      
      if (handlerResponse instanceof NextResponse) {
        nextResponse = handlerResponse;
      } else if (handlerResponse instanceof Response) {
        // Convert Response to NextResponse
        const responseBody = await handlerResponse.text();
        nextResponse = new NextResponse(responseBody, {
          status: handlerResponse.status,
          statusText: handlerResponse.statusText,
          headers: handlerResponse.headers,
        });
      } else {
        // Handle edge cases where response might be something else
        this.logger.warn('Handler returned unexpected response type', {
          type: typeof handlerResponse,
          requestId
        });
        nextResponse = NextResponse.json(
          { error: 'Internal server error - invalid response type' }, 
          { status: 500 }
        );
      }

      this.logger.info('Middleware chain completed successfully', {
        requestId,
        handlerDuration,
        totalDuration,
        statusCode: nextResponse.status,
      });

      // Add request ID and timing to response headers
      nextResponse.headers.set('x-request-id', requestId);
      nextResponse.headers.set('x-response-time', `${totalDuration}ms`);

      // Store context for any post-processing
      (nextResponse as any).middlewareContext = context;

      return nextResponse;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error('Middleware chain failed', error instanceof Error ? error : new Error(String(error)), {
        requestId,
        totalDuration,
        url: request.url,
        method: request.method,
      });
      throw error;
    }
  }

  getRegisteredMiddlewares(): Array<{ name: string; enabled: boolean; order: number }> {
    return this.middlewares.map(m => ({
      name: m.config.name,
      enabled: m.config.enabled,
      order: m.config.order,
    }));
  }
}