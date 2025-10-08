import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import { MxRecord } from 'dns';
import { promisify } from 'util';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DNS_CONSTANTS } from '@mail-validation/modules/dns-resolver/constants';
import { DomainResolutionResult } from '@mail-validation/modules/dns-resolver/interfaces';
import { CacheStatsDto } from '@mail-validation/modules/dns-resolver/dtos';



const dnsResolveMx = promisify(dns.resolveMx);
const dnsResolveA = promisify(dns.resolve4);
const dnsResolveAaaa = promisify(dns.resolve6);
const dnsResolveTxt = promisify(dns.resolveTxt);

@Injectable()
export class DomainResolverService {
  private readonly logger = new Logger(DomainResolverService.name);
  private readonly defaultTtl = DNS_CONSTANTS.DEFAULT_TTL;

  constructor(
    private readonly cacheProvider: AbstractCacheProvider,
  ) {}

  async resolveDomain(domain: string, useCache: boolean = true): Promise<DomainResolutionResult> {
    const startTime = Date.now();
    const normalizedDomain = this.normalizeDomain(domain);

    this.logger.debug(`Resolving domain: ${normalizedDomain}`);

    // Check cache first
    if (useCache) {
      const cached = await this.getFromCache(normalizedDomain);
      if (cached) {
        this.logger.debug(`Cache hit for domain: ${normalizedDomain}`);
        return { ...cached, cached: true };
      }
    }

    try {
      const result = await this.performResolution(normalizedDomain, startTime);
      
      // Cache the result
      await this.setCache(normalizedDomain, result);
      
      this.logger.debug(`DNS resolution completed for ${normalizedDomain} in ${result.resolutionTime}ms`);
      return { ...result, cached: false };
    } catch (error) {
      this.logger.error(`DNS resolution failed for ${normalizedDomain}:`, error);
      return {
        domain: normalizedDomain,
        mxRecords: [],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: false,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: Date.now() - startTime,
        cached: false,
        error: error.message,
      };
    }
  }

  private async performResolution(domain: string, startTime: number): Promise<DomainResolutionResult> {
    this.logger.debug(`Performing DNS resolution for ${domain}`);
    
    const [mxRecords, aRecords, aaaaRecords] = await Promise.allSettled([
      this.resolveMx(domain),
      this.resolveA(domain),
      this.resolveAaaa(domain),
    ]);

    const mxResult = mxRecords.status === 'fulfilled' ? mxRecords.value : [];
    const aResult = aRecords.status === 'fulfilled' ? aRecords.value : [];
    const aaaaResult = aaaaRecords.status === 'fulfilled' ? aaaaRecords.value : [];

    const result = {
      domain,
      mxRecords: mxResult,
      aRecords: aResult,
      aaaaRecords: aaaaResult,
      hasValidMx: mxResult.length > 0,
      hasValidA: aResult.length > 0,
      hasValidAaaa: aaaaResult.length > 0,
      resolutionTime: Date.now() - startTime,
      cached: false,
    };

    this.logger.debug(`Resolution result for ${domain}:`, {
      mxCount: mxResult.length,
      aCount: aResult.length,
      aaaaCount: aaaaResult.length,
      time: result.resolutionTime,
    });

    return result;
  }

  private async resolveMx(domain: string): Promise<Array<MxRecord>> {
    try {
      this.logger.debug(`Resolving MX records for ${domain}`);
      const records = await dnsResolveMx(domain);
      const sortedRecords = records.sort((a, b) => a.priority - b.priority);
      
      this.logger.debug(`Found ${sortedRecords.length} MX records for ${domain}`);
      return sortedRecords;
    } catch (error) {
      this.logger.debug(`No MX records found for ${domain}:`, error.message);
      return [];
    }
  }

  private async resolveA(domain: string): Promise<string[]> {
    try {
      this.logger.debug(`Resolving A records for ${domain}`);
      const records = await dnsResolveA(domain);
      this.logger.debug(`Found ${records.length} A records for ${domain}`);
      return records;
    } catch (error) {
      this.logger.debug(`No A records found for ${domain}:`, error.message);
      return [];
    }
  }

  private async resolveAaaa(domain: string): Promise<string[]> {
    try {
      this.logger.debug(`Resolving AAAA records for ${domain}`);
      const records = await dnsResolveAaaa(domain);
      this.logger.debug(`Found ${records.length} AAAA records for ${domain}`);
      return records;
    } catch (error) {
      this.logger.debug(`No AAAA records found for ${domain}:`, error.message);
      return [];
    }
  }

  private normalizeDomain(domain: string): string {
    try {
      // Convert to punycode for international domains and normalize
      return domain.toLowerCase().trim();
    } catch (error) {
      this.logger.warn(`Failed to normalize domain ${domain}:`, error);
      return domain.toLowerCase().trim();
    }
  }

  private async getFromCache(domain: string): Promise<DomainResolutionResult> {
    try {
      const cacheKey = `${DNS_CONSTANTS.CACHE_KEY_PREFIX}${domain}`;
      const cached = await this.cacheProvider.get<string>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for domain: ${domain}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get DNS result from cache for ${domain}:`, error);
      return null;
    }
  }

  private async setCache(domain: string, result: DomainResolutionResult): Promise<void> {
    try {
      const cacheKey = `${DNS_CONSTANTS.CACHE_KEY_PREFIX}${domain}`;
      await this.cacheProvider.set(cacheKey, JSON.stringify(result), this.defaultTtl);
      this.logger.debug(`Cached DNS result for domain: ${domain}`);
    } catch (error) {
      this.logger.warn(`Failed to cache DNS result for ${domain}:`, error);
    }
  }

  async getCacheStats(): Promise<CacheStatsDto> {
    try {
      const dnsCacheEntries: Array<{ key: string; value: any }> = [];
      
      if (this.cacheProvider.iterator) {
        for await (const [key, value] of this.cacheProvider.iterator()) {
          if (key.startsWith(DNS_CONSTANTS.CACHE_KEY_PREFIX)) {
            dnsCacheEntries.push({ key, value });
          }
        }
      }
      
      return new CacheStatsDto({
        size: dnsCacheEntries.length,
        domains: dnsCacheEntries.map(({ key }) => key.replace(DNS_CONSTANTS.CACHE_KEY_PREFIX, '')),
        memoryUsage: 'N/A', // Cache provider handles memory management
      });
    } catch (error) {
      this.logger.warn('Failed to get cache stats:', error);
      return new CacheStatsDto({
        size: 0,
        domains: [],
        memoryUsage: 'N/A',
      });
    }
  }

  async clearCache(): Promise<void> {
    try {
      const dnsCacheKeys: string[] = [];
      
      if (this.cacheProvider.iterator) {
        for await (const [key] of this.cacheProvider.iterator()) {
          if (key.startsWith(DNS_CONSTANTS.CACHE_KEY_PREFIX)) {
            dnsCacheKeys.push(key);
          }
        }
      }
      
      if (dnsCacheKeys.length > 0) {
        await this.cacheProvider.delete(dnsCacheKeys);
        this.logger.log(`DNS cache cleared (${dnsCacheKeys.length} entries removed)`);
      } else {
        this.logger.log('DNS cache was already empty');
      }
    } catch (error) {
      this.logger.error('Failed to clear DNS cache:', error);
    }
  }

  // Utility method for testing
  async testResolution(domain: string): Promise<void> {
    this.logger.log(`Testing DNS resolution for ${domain}`);
    const result = await this.resolveDomain(domain);
    this.logger.log(`Test result:`, {
      domain: result.domain,
      hasMx: result.hasValidMx,
      hasA: result.hasValidA,
      hasAaaa: result.hasValidAaaa,
      mxCount: result.mxRecords.length,
      aCount: result.aRecords.length,
      aaaaCount: result.aaaaRecords.length,
      time: result.resolutionTime,
      error: result.error,
    });
  }
}
