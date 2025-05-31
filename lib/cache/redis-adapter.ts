// lib/cache/redis-adapter.ts
import { Redis } from 'ioredis';
import { CacheAdapter } from './cache-manager';
import { createLogger } from '@/lib/logger';

export class RedisAdapter extends CacheAdapter {
  private client: Redis;
  private logger = createLogger({ requestId: 'redis-adapter' });

  constructor(config: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    lazyConnect?: boolean;
  } = {}) {
    super();
    
    const redisConfig = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      lazyConnect: config.lazyConnect !== false,
      // Connection options for reliability
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
    };

    this.client = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis reconnecting');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.client.get(key);
      if (result === null) {
        return null;
      }
      return JSON.parse(result) as T;
    } catch (error) {
      this.logger.error('Redis get error', error instanceof Error ? error : new Error(String(error)), { key });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl && ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error('Redis set error', error instanceof Error ? error : new Error(String(error)), { key, ttl });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Redis del error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        await this.client.flushdb();
      }
    } catch (error) {
      this.logger.error('Redis clear error', error instanceof Error ? error : new Error(String(error)), { pattern });
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis has error', error instanceof Error ? error : new Error(String(error)), { key });
      return false;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern || '*');
    } catch (error) {
      this.logger.error('Redis keys error', error instanceof Error ? error : new Error(String(error)), { pattern });
      return [];
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error('Redis ttl error', error instanceof Error ? error : new Error(String(error)), { key });
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis expire error', error instanceof Error ? error : new Error(String(error)), { key, seconds });
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await this.client.mget(...keys);
      return results.map(result => 
        result ? JSON.parse(result) as T : null
      );
    } catch (error) {
      this.logger.error('Redis mget error', error instanceof Error ? error : new Error(String(error)), { keys });
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<[string, T]>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of keyValuePairs) {
        const serialized = JSON.stringify(value);
        if (ttl && ttl > 0) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Redis mset error', error instanceof Error ? error : new Error(String(error)), { 
        keys: keyValuePairs.map(([k]) => k), 
        ttl 
      });
      throw error;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      this.logger.error('Redis increment error', error instanceof Error ? error : new Error(String(error)), { key, amount });
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async getInfo(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      this.logger.error('Redis info error', error instanceof Error ? error : new Error(String(error)));
      return '';
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Redis disconnected');
    } catch (error) {
      this.logger.error('Redis disconnect error', error instanceof Error ? error : new Error(String(error)));
    }
  }
}