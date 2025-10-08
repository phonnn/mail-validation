import { Injectable, Logger } from '@nestjs/common';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import {
  DomainResolutionResult, 
  ResolutionSource, 
  DnsRecordType
} from '@mail-validation/modules/dns-resolver/types';
import { CacheStatsDto } from '@mail-validation/modules/dns-resolver/dtos';
import { MxResolverService } from '@mail-validation/modules/dns-resolver/services/mx-resolver.service';
import { AResolverService } from '@mail-validation/modules/dns-resolver/services/a-resolver.service';
import { TxtResolverService } from '@mail-validation/modules/dns-resolver/services/txt-resolver.service';
import { AAAAResolverService } from '@mail-validation/modules/dns-resolver/services/aaaa-resolver.service';


@Injectable()
export class DomainResolverService {
  private readonly logger = new Logger(DomainResolverService.name);

  constructor(
    private readonly cacheProvider: AbstractCacheProvider,
    private readonly mxResolver: MxResolverService,
    private readonly aResolver: AResolverService,
    private readonly aaaaResolver: AAAAResolverService,
    private readonly txtResolver: TxtResolverService,
  ) {}

  /**
   * Normalizes a domain name by converting to lowercase and trimming whitespace
   * @param domain The domain to normalize
   * @returns The normalized domain
   */
  private normalizeDomain(domain: string): string {
    try {
      // Convert to punycode for international domains and normalize
      return domain.toLowerCase().trim();
    } catch (error) {
      this.logger.warn(`Failed to normalize domain ${domain}:`, error);
      return domain.toLowerCase().trim();
    }
  }

  /**
   * Extracts records from a Promise.allSettled result
   * @param result The Promise.allSettled result
   * @param defaultValue Default value if the promise was rejected
   * @returns The records array or default value
   */
  private extractRecords<T>(result: PromiseSettledResult<any>, defaultValue: T[]): T[] {
    return result.status === 'fulfilled' ? result.value.records : defaultValue;
  }

  /**
   * Determines the overall resolution source based on individual resolver results
   * @param results Array of Promise.allSettled results
   * @returns The overall resolution source
   */
  private determineOverallSource(results: PromiseSettledResult<any>[]): ResolutionSource {
    // Check if any resolver had an error
    const hasError = results.some(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.source === ResolutionSource.ERROR)
    );
    
    if (hasError) {
      return ResolutionSource.ERROR;
    }

    // Check if any resolver used cache
    const hasCache = results.some(result => 
      result.status === 'fulfilled' && result.value.source === ResolutionSource.CACHE
    );
    
    if (hasCache) {
      return ResolutionSource.CACHE;
    }

    // All resolvers used DNS
    return ResolutionSource.DNS;
  }

  async resolveDomain(domain: string): Promise<DomainResolutionResult> {
    const startTime = Date.now();
    const normalizedDomain = this.normalizeDomain(domain);

    this.logger.debug(`Resolving domain: ${normalizedDomain}`);

    try {
      const result = await this.resolveAllRecords(normalizedDomain, startTime);
      
      this.logger.debug(`DNS resolution completed for ${normalizedDomain} in ${result.resolutionTime}ms`);
      return result;
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
        source: ResolutionSource.ERROR,
        error: error.message,
      };
    }
  }

  private async resolveAllRecords(domain: string, startTime: number): Promise<DomainResolutionResult> {
    this.logger.debug(`Performing DNS resolution with modular resolvers for ${domain}`);
    
    // Resolve all record types in parallel
    const [mxResult, aResult, aaaaResult, txtResult] = await Promise.allSettled([
      this.mxResolver.resolve(domain),
      this.aResolver.resolve(domain),
      this.aaaaResolver.resolve(domain),
      this.txtResolver.resolve(domain),
    ]);

    // Extract records from results (handle both success and failure cases)
    const mxRecords = this.extractRecords(mxResult, []);
    const aRecords = this.extractRecords(aResult, []);
    const aaaaRecords = this.extractRecords(aaaaResult, []);
    const txtRecords = this.extractRecords(txtResult, []);

    // Determine overall resolution source
    const overallSource = this.determineOverallSource([mxResult, aResult, aaaaResult, txtResult]);

    const result: DomainResolutionResult = {
      domain,
      mxRecords,
      aRecords,
      aaaaRecords,
      hasValidMx: mxRecords.length > 0,
      hasValidA: aRecords.length > 0,
      hasValidAaaa: aaaaRecords.length > 0,
      resolutionTime: Date.now() - startTime,
      source: overallSource,
    };

    this.logger.debug(`Resolution completed for ${domain}:`, {
      mxCount: mxRecords.length,
      aCount: aRecords.length,
      aaaaCount: aaaaRecords.length,
      txtCount: txtRecords.length,
      time: result.resolutionTime,
      source: result.source,
    });

    return result;
  }

  // Utility methods for individual record type resolution
  async resolveMxRecords(domain: string) {
    return this.mxResolver.resolve(domain);
  }

  async resolveARecords(domain: string) {
    return this.aResolver.resolve(domain);
  }

  async resolveAaaaRecords(domain: string) {
    return this.aaaaResolver.resolve(domain);
  }

  async resolveTxtRecords(domain: string) {
    return this.txtResolver.resolve(domain);
  }

  async getCacheStats(): Promise<CacheStatsDto> {
    try {
      // Get stats from each resolver
      const [mxStats, aStats, aaaaStats, txtStats] = await Promise.all([
        this.mxResolver.getCacheStats(),
        this.aResolver.getCacheStats(),
        this.aaaaResolver.getCacheStats(),
        this.txtResolver.getCacheStats(),
      ]);

      // Combine all domains
      const allDomains = new Set([
        ...mxStats.domains,
        ...aStats.domains,
        ...aaaaStats.domains,
        ...txtStats.domains,
      ]);

      const totalSize = mxStats.size + aStats.size + aaaaStats.size + txtStats.size;

      return new CacheStatsDto({
        size: totalSize,
        domains: Array.from(allDomains),
        memoryUsage: 'N/A', // Cache provider handles memory management
        typeStats: {
          [DnsRecordType.MX]: mxStats.size,
          [DnsRecordType.A]: aStats.size,
          [DnsRecordType.AAAA]: aaaaStats.size,
          [DnsRecordType.TXT]: txtStats.size,
          [DnsRecordType.ALL]: 0, // Not applicable for individual stats
        },
      });
    } catch (error) {
      this.logger.warn('Failed to get cache stats:', error);
      return new CacheStatsDto({
        size: 0,
        domains: [],
        memoryUsage: 'N/A',
        typeStats: {
          [DnsRecordType.MX]: 0,
          [DnsRecordType.A]: 0,
          [DnsRecordType.AAAA]: 0,
          [DnsRecordType.TXT]: 0,
          [DnsRecordType.ALL]: 0,
        },
      });
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear cache from all resolvers
      await Promise.all([
        this.mxResolver.clearCache(),
        this.aResolver.clearCache(),
        this.aaaaResolver.clearCache(),
        this.txtResolver.clearCache(),
      ]);
      
      this.logger.log('All DNS cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear DNS cache:', error);
    }
  }

  // New methods for per-type cache management
  async clearCacheByType(recordType: DnsRecordType): Promise<void> {
    try {
      switch (recordType) {
        case DnsRecordType.MX:
          await this.mxResolver.clearCache();
          break;
        case DnsRecordType.A:
          await this.aResolver.clearCache();
          break;
        case DnsRecordType.AAAA:
          await this.aaaaResolver.clearCache();
          break;
        case DnsRecordType.TXT:
          await this.txtResolver.clearCache();
          break;
        case DnsRecordType.ALL:
          await this.clearCache();
          break;
      }
      
      this.logger.log(`DNS ${recordType} cache cleared`);
    } catch (error) {
      this.logger.error(`Failed to clear DNS ${recordType} cache:`, error);
    }
  }

  async clearCacheByDomain(domain: string): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      
      // Clear cache for specific domain from all resolvers
      await Promise.all([
        this.mxResolver.clearCache(normalizedDomain),
        this.aResolver.clearCache(normalizedDomain),
        this.aaaaResolver.clearCache(normalizedDomain),
        this.txtResolver.clearCache(normalizedDomain),
      ]);
      
      this.logger.log(`DNS cache cleared for domain ${normalizedDomain}`);
    } catch (error) {
      this.logger.error(`Failed to clear DNS cache for domain ${domain}:`, error);
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

