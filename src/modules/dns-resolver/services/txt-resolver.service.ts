import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as dns from 'dns';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DnsResolverAbstract } from '@mail-validation/modules/dns-resolver/services/dns-resolver.abstract';
import {
  DnsResolverResult,
  TxtResolutionResult,
  ResolutionSource,
} from '@mail-validation/modules/dns-resolver/types';

const dnsResolveTxt = promisify(dns.resolveTxt);

@Injectable()
export class TxtResolverService extends DnsResolverAbstract<string[], TxtResolutionResult> {
  constructor(cacheProvider: AbstractCacheProvider) {
    super(cacheProvider, 'txt');
  }

  async resolve(domain: string): Promise<DnsResolverResult<string[]>> {
    const startTime = Date.now();

    this.logger.debug(`Resolving TXT records for ${domain}`);

    // Always check cache first
    const cached = await this.getCached(domain);
    if (cached) {
      this.logger.debug(`TXT cache hit for ${domain}`);
      return {
        records: cached,
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.CACHE,
      };
    }

    // Cache miss - resolve from DNS
    try {
      this.logger.debug(`TXT cache miss for ${domain}, resolving from DNS`);
      const result = await this.performDnsResolution(domain);
      
      // Cache the result for next time
      await this.setCached(domain, result.records);
      
      return {
        records: result.records,
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.DNS,
      };
    } catch (error) {
      this.logger.error(`TXT resolution failed for ${domain}:`, error);
      return {
        records: [],
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.ERROR,
        error: error.message,
      };
    }
  }

  async performDnsResolution(domain: string): Promise<TxtResolutionResult> {
    try {
      this.logger.debug(`Performing TXT DNS resolution for ${domain}`);
      const records = await dnsResolveTxt(domain);
      
      this.logger.debug(`Found ${records.length} TXT records for ${domain}`);
      return { records };
    } catch (error) {
      this.logger.debug(`No TXT records found for ${domain}:`, error.message);
      return { records: [] };
    }
  }

  protected getRecordTypeTtl(): number {
    // TXT records typically have medium TTL (4 hours)
    return 4 * 60 * 60; // 4 hours
  }

  // Utility method to get specific TXT record values
  async getTxtRecordValues(domain: string): Promise<string[]> {
    const result = await this.resolve(domain);
    return result.records.flat(); // Flatten the array of arrays
  }

  // Utility method to find specific TXT record by prefix
  async findTxtRecordByPrefix(domain: string, prefix: string): Promise<string[]> {
    const result = await this.resolve(domain);
    return result.records
      .flat()
      .filter(record => record.startsWith(prefix));
  }
}
