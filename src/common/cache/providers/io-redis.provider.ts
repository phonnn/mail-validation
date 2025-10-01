import Redis from 'ioredis';
import { CacheProvider } from '@mail-validation/common/cache/decorators/cache-provider.decorator';
import { CacheProviderEnum } from '@mail-validation/common/cache/enums/cache-provider.enum';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';


interface Options {
  mode?: string;
}

@CacheProvider(CacheProviderEnum.IOREDIS)
export class IoredisCacheProvider extends AbstractCacheProvider {
  private readonly redis: Redis;
  private readonly namespace: string;
  private readonly ttl?: number;

  constructor(redisUri: string, namespace: string, ttl?: number) {
    super();
    this.redis = new Redis(redisUri);
    this.namespace = namespace;
    this.ttl = ttl;
  }

  async get<T = any>(key: string): Promise<T> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T = any>(
    key: string,
    value: T,
    ttl?: number,
    options?: Options,
  ): Promise<any> {
    const { mode } = options ?? {};
    const data = JSON.stringify(value);
    const ttlToUse = ttl ?? this.ttl;

    const args = [];
    if (ttlToUse) {
      args.push('EX', ttlToUse);
    }

    if (mode) {
      args.push(mode);
    }

    return this.redis.set(key, data, ...args);
  }

  async delete(keys: string[] | string): Promise<boolean> {
    const arr = Array.isArray(keys) ? keys : [keys];
    const result = await this.redis.del(...arr);
    return result > 0;
  }

  async clear(): Promise<void> {
    const deleteKeys = [];
    for await (const [key] of this.iterator()) {
      deleteKeys.push(key);
    }

    await this.redis.del(...deleteKeys);
  }

  async *iterator(): AsyncGenerator<[string, any]> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.sscan(
        `namespace:${this.namespace}`,
        cursor,
      );
      cursor = nextCursor;
      for (const key of keys) {
        const { value } = await this.get(key);
        yield [key, value];
      }
    } while (cursor !== '0');
  }
}
