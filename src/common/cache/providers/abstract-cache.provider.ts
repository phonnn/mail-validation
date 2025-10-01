import { CacheProviderInterface } from '@mail-validation/common/cache/interface/cache-provider.interface';

/*
 * Abstract class for all provider
 * Should extend from this class with custom logic
 * */
export abstract class AbstractCacheProvider implements CacheProviderInterface {
  abstract get<T = any>(key: string): Promise<T>;
  abstract set<
    T = any,
    Options extends Record<string, any> = Record<string, any>,
  >(key: string, value: T, ttl?: number, options?: Options): Promise<any>;
  abstract delete(keys: string[] | string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract iterator?(): AsyncGenerator<[string, any]>;
}
