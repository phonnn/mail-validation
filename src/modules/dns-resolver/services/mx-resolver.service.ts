import { Injectable } from '@nestjs/common';
import { MxRecord } from 'dns';
import { promisify } from 'util';
import * as dns from 'dns';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DnsResolverAbstract } from '@mail-validation/modules/dns-resolver/services/dns-resolver.abstract';
import {
  DnsResolverResult,
  MxResolutionResult,
  ResolutionSource,
} from '@mail-validation/modules/dns-resolver/types';

const dnsResolveMx = promisify(dns.resolveMx);

@Injectable()
export class MxResolverService extends DnsResolverAbstract<MxRecord, MxResolutionResult> {
  constructor(cacheProvider: AbstractCacheProvider) {
    super(cacheProvider, 'mx');
  }

  async resolve(domain: string): Promise<DnsResolverResult<MxRecord>> {
    const startTime = Date.now();

    this.logger.debug(`Resolving MX records for ${domain}`);

    // Always check cache first - this is the natural behavior
    const cached = await this.getCached(domain);
    if (cached) {
      this.logger.debug(`MX cache hit for ${domain}`);
      return {
        records: cached,
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.CACHE,
      };
    }

    // Cache miss - resolve from DNS
    try {
      this.logger.debug(`MX cache miss for ${domain}, resolving from DNS`);
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
      this.logger.error(`MX resolution failed for ${domain}:`, error);
      return {
        records: [],
        ttl: this.getRecordTypeTtl(),
        resolutionTime: Date.now() - startTime,
        source: ResolutionSource.ERROR,
        error: error.message,
      };
    }
  }

  async performDnsResolution(domain: string): Promise<MxResolutionResult> {
    try {
      this.logger.debug(`Performing MX DNS resolution for ${domain}`);
      const records = await dnsResolveMx(domain);
      
      // Sort by priority (lower number = higher priority)
      const sortedRecords = records.sort((a, b) => a.priority - b.priority);
      
      this.logger.debug(`Found ${sortedRecords.length} MX records for ${domain}`);
      return { records: sortedRecords };
    } catch (error) {
      this.logger.debug(`No MX records found for ${domain}:`, error.message);
      return { records: [] };
    }
  }

  protected getRecordTypeTtl(): number {
    // MX records typically have longer TTL (24 hours)
    return 24 * 60 * 60; // 24 hours
  }
}
