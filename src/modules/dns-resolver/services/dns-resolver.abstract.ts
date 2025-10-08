import { Logger } from '@nestjs/common';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import {
  DnsResolutionResult,
  DnsResolverResult,
} from '@mail-validation/modules/dns-resolver/types';
import { DnsResolverInterface } from '@mail-validation/modules/dns-resolver/interfaces';
import { DNS_CONSTANTS } from '@mail-validation/modules/dns-resolver/constants';

export abstract class DnsResolverAbstract<T, TResolutionResult extends DnsResolutionResult<T>> 
  implements DnsResolverInterface<T, TResolutionResult> {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly defaultTtl = DNS_CONSTANTS.DEFAULT_TTL;

  protected constructor(
    protected readonly cacheProvider: AbstractCacheProvider,
    protected readonly recordType: string,
  ) {}

  abstract resolve(domain: string): Promise<DnsResolverResult<T>>;
  abstract performDnsResolution(domain: string): Promise<TResolutionResult>;
  protected abstract getRecordTypeTtl(): number;

  async getCached(domain: string): Promise<T[] | null> {
    try {
      const cacheKey = this.getCacheKey(domain);
      const cached = await this.cacheProvider.get<string>(cacheKey);
      
      if (cached) {
        this.logger.debug(`${this.recordType} cache hit for domain: ${domain}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get ${this.recordType} records from cache for ${domain}:`, error);
      return null;
    }
  }

  async setCached(domain: string, records: T[], ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(domain);
      const recordTtl = ttl || this.getRecordTypeTtl();
      await this.cacheProvider.set(cacheKey, JSON.stringify(records), recordTtl);
      this.logger.debug(`Cached ${this.recordType} records for domain: ${domain} (TTL: ${recordTtl}s)`);
    } catch (error) {
      this.logger.warn(`Failed to cache ${this.recordType} records for ${domain}:`, error);
    }
  }

  async clearCache(domain?: string): Promise<void> {
    try {
      const cacheKeys: string[] = [];
      
      if (this.cacheProvider.iterator) {
        for await (const [key] of this.cacheProvider.iterator()) {
          if (domain) {
            const expectedKey = this.getCacheKey(domain);
            if (key === expectedKey) {
              cacheKeys.push(key);
            }
          } else if (key.startsWith(this.getCacheKeyPrefix())) {
            cacheKeys.push(key);
          }
        }
      }
      
      if (cacheKeys.length > 0) {
        await this.cacheProvider.delete(cacheKeys);
        this.logger.log(`${this.recordType} cache cleared (${cacheKeys.length} entries removed)`);
      } else {
        this.logger.log(`${this.recordType} cache was already empty`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear ${this.recordType} cache:`, error);
    }
  }

  async getCacheStats(): Promise<{ size: number; domains: string[] }> {
    try {
      const cacheEntries: string[] = [];
      
      if (this.cacheProvider.iterator) {
        for await (const [key] of this.cacheProvider.iterator()) {
          if (key.startsWith(this.getCacheKeyPrefix())) {
            cacheEntries.push(key);
          }
        }
      }
      
      const domains = cacheEntries.map(key => 
        key.replace(this.getCacheKeyPrefix(), '').replace(`:${this.recordType}`, '')
      );
      
      return {
        size: cacheEntries.length,
        domains: [...new Set(domains)], // Remove duplicates
      };
    } catch (error) {
      this.logger.warn(`Failed to get ${this.recordType} cache stats:`, error);
      return { size: 0, domains: [] };
    }
  }

  protected getCacheKey(domain: string): string {
    return `${this.getCacheKeyPrefix()}${domain}:${this.recordType}`;
  }

  protected getCacheKeyPrefix(): string {
    return DNS_CONSTANTS.CACHE_KEY_PREFIX;
  }

}
