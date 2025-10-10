import { Injectable, Logger, Inject } from '@nestjs/common';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import {
  DNS_RESOLVER_TOKEN,
  SMTP_CONSTANTS,
} from '@mail-validation/modules/smtp-probe/constants';
import {
  DnsResolverInterface,
  MxShardingInterface,
} from '@mail-validation/modules/smtp-probe/interfaces';
import {
  EmailShard,
  MxRecord,
} from '@mail-validation/modules/smtp-probe/types';

@Injectable()
export class MxShardingService implements MxShardingInterface {
  private readonly logger = new Logger(MxShardingService.name);

  constructor(
    private readonly cacheProvider: AbstractCacheProvider,
    private readonly configService: SmtpProbeConfigService,
    @Inject(DNS_RESOLVER_TOKEN) private readonly dnsResolver: DnsResolverInterface,
  ) {}

  /**
   * Shard emails by their MX records for optimal batch processing
   */
  async shardEmailsByMx(emails: string[]): Promise<EmailShard[]> {
    this.logger.debug(`Sharding ${emails.length} emails by MX records`);

    // Group emails by domain
    const domainGroups = new Map<string, string[]>();
    
    for (const email of emails) {
      const domain = this.extractDomain(email);
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(email);
    }

    // Process each domain group
    const shards: EmailShard[] = [];
    
    for (const [domain, domainEmails] of domainGroups) {
      try {
        const mxRecords = await this.getMxRecords(domain);
        
        if (mxRecords.length === 0) {
          this.logger.warn(`No MX records found for domain: ${domain}`);
          // Create a shard with empty MX records for emails that can't be processed
          shards.push({
            emails: domainEmails,
            domain,
            mxRecords: [],
          });
          continue;
        }

        // Sort MX records by priority (lower number = higher priority)
        const sortedMxRecords = mxRecords.sort((a, b) => a.priority - b.priority);
        
        // Take only the highest priority MX records (up to maxMxRecords limit)
        const limitedMxRecords = sortedMxRecords.slice(0, this.configService.maxMxRecords);
        
        // Create shard for this domain
        shards.push({
          emails: domainEmails,
          domain,
          mxRecords: limitedMxRecords,
        });

        this.logger.debug(`Created shard for domain ${domain} with ${limitedMxRecords.length} MX records and ${domainEmails.length} emails`);
      } catch (error) {
        this.logger.error(`Failed to get MX records for domain ${domain}:`, error);
        
        // Create shard with empty MX records for failed domains
        shards.push({
          emails: domainEmails,
          domain,
          mxRecords: [],
        });
      }
    }

    this.logger.debug(`Created ${shards.length} email shards`);
    return shards;
  }

  /**
   * Get MX records for a domain (with caching)
   */
  async getMxRecords(domain: string): Promise<MxRecord[]> {
    const normalizedDomain = this.normalizeDomain(domain);
    const cacheKey = `${SMTP_CONSTANTS.MX_CACHE_KEY_PREFIX}${normalizedDomain}`;

    try {
      // Try to get from cache first
      const cached = await this.cacheProvider.get(cacheKey);
      if (cached) {
        this.logger.debug(`MX records for ${normalizedDomain} found in cache`);
        return JSON.parse(cached);
      }

      // Resolve MX records using DNS
      const mxRecords = await this.performMxResolution(normalizedDomain);
      
      // Cache the results
      if (mxRecords.length > 0) {
        await this.cacheProvider.set(
          cacheKey,
          JSON.stringify(mxRecords),
          this.configService.mxCacheTtl,
        );
        this.logger.debug(`Cached MX records for ${normalizedDomain}`);
      }

      return mxRecords;
    } catch (error) {
      this.logger.error(`Failed to resolve MX records for ${normalizedDomain}:`, error);
      throw error;
    }
  }

  /**
   * Perform actual MX resolution using DNS resolver service
   */
  private async performMxResolution(domain: string): Promise<MxRecord[]> {
    const resolutionResult = await this.dnsResolver.resolveDomain(domain);
    
    // Convert DomainResolutionResult MX records to our MxRecord format
    return resolutionResult.mxRecords.map(mx => ({
      exchange: mx.exchange,
      priority: mx.priority,
    }));
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return parts[1].toLowerCase().trim();
  }

  /**
   * Normalize domain name
   */
  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().trim();
  }

  /**
   * Clear MX cache for a specific domain or all domains
   */
  async clearMxCache(domain?: string): Promise<void> {
    if (domain) {
      const cacheKey = `${SMTP_CONSTANTS.MX_CACHE_KEY_PREFIX}${this.normalizeDomain(domain)}`;
      await this.cacheProvider.delete(cacheKey);
      this.logger.debug(`Cleared MX cache for domain: ${domain}`);
    } else {
      // Clear all MX cache entries
      const pattern = `${SMTP_CONSTANTS.MX_CACHE_KEY_PREFIX}*`;
      const keys = await this.getKeysByPattern(pattern);
      if (keys.length > 0) {
        await this.cacheProvider.delete(keys);
        this.logger.debug(`Cleared ${keys.length} MX cache entries`);
      }
    }
  }

  /**
   * Get cache statistics for MX records
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    domains: string[];
    hitRate?: number;
  }> {
      const pattern = `${SMTP_CONSTANTS.MX_CACHE_KEY_PREFIX}*`;
    const keys = await this.getKeysByPattern(pattern);
    
    const domains = keys.map(key => key.replace(SMTP_CONSTANTS.MX_CACHE_KEY_PREFIX, ''));
    
    return {
      totalEntries: keys.length,
      domains,
    };
  }

  /**
   * Get keys matching a pattern using cache iterator
   */
  private async getKeysByPattern(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    if (this.cacheProvider.iterator) {
      for await (const [key] of this.cacheProvider.iterator()) {
        if (regex.test(key)) {
          keys.push(key);
        }
      }
    }
    
    return keys;
  }
}
