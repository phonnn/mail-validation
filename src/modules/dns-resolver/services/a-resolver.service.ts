import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as dns from 'dns';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DnsResolverAbstract } from '@mail-validation/modules/dns-resolver/services/dns-resolver.abstract';
import {
  AResolutionResult,
  DnsResolverResult,
  ResolutionSource,
} from '@mail-validation/modules/dns-resolver/types';

const dnsResolveA = promisify(dns.resolve4);

@Injectable()
export class AResolverService extends DnsResolverAbstract<string, AResolutionResult> {
  constructor(cacheProvider: AbstractCacheProvider) {
    super(cacheProvider, 'a');
  }

  async resolve(domain: string): Promise<DnsResolverResult<string>> {
    const startTime = Date.now();

    this.logger.debug(`Resolving A records for ${domain}`);

    // Always check cache first
    const cached = await this.getCached(domain);
    if (cached) {
      this.logger.debug(`A cache hit for ${domain}`);
        return {
          records: cached,
          ttl: this.getRecordTypeTtl(),
          resolutionTime: Date.now() - startTime,
          source: ResolutionSource.CACHE,
        };
    }

        // Cache miss - resolve from DNS
        try {
          this.logger.debug(`A cache miss for ${domain}, resolving from DNS`);
          const result = await this.performDnsResolution(domain);
          
          // Cache the result for next time with actual TTL
          await this.setCached(domain, result.records, result.ttl);
          
          return {
            records: result.records,
            ttl: result.ttl,
            resolutionTime: Date.now() - startTime,
            source: ResolutionSource.DNS,
          };
    } catch (error) {
      this.logger.error(`A resolution failed for ${domain}:`, error);
      return {
        records: [],
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.ERROR,
        error: error.message,
      };
    }
  }

  async performDnsResolution(domain: string): Promise<AResolutionResult> {
    try {
      this.logger.debug(`Performing A DNS resolution for ${domain}`);
      const records = await dnsResolveA(domain, { ttl: true });
      
      // Extract records and calculate minimum TTL
      const ipAddresses = records.map(record => record.address);
      const minTtl = records.length > 0 ? Math.min(...records.map(record => record.ttl)) : this.getRecordTypeTtl();
      
      this.logger.debug(`Found ${ipAddresses.length} A records for ${domain} with TTL: ${minTtl}s`);
      return { records: ipAddresses, ttl: minTtl };
    } catch (error) {
      this.logger.debug(`No A records found for ${domain}:`, error.message);
      return { records: [], ttl: this.getRecordTypeTtl() };
    }
  }

  protected getRecordTypeTtl(): number {
    // A records typically have shorter TTL (1 hour)
    return 60 * 60; // 1 hour
  }
}
