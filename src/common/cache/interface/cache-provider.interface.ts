export interface CacheProviderInterface {
  get<T = any>(key: string): Promise<T>;
  set<T = any, Options extends Record<string, any> = Record<string, any>>(
    key: string,
    value: T,
    ttl?: number,
    options?: Options,
  ): Promise<any>;
  delete(keys: string[] | string): Promise<boolean>;
  clear(): Promise<void>;
  iterator?(): AsyncGenerator<[string, any]>;
}
