import { Injectable, Logger } from '@nestjs/common';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DomainResolverService } from '@mail-validation/modules/dns-resolver/services/domain-resolver.service';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import { SmtpConnectionPoolService } from '@mail-validation/modules/smtp-probe/services/smtp-connection-pool.service';
import { SmtpResponseParserService } from '@mail-validation/modules/smtp-probe/services/smtp-response-parser.service';
import { 
  SmtpProbeResult, 
  MxProbeResult, 
  EmailVerdict,
  VerdictScore,
  SmtpProbeCacheStats
} from '@mail-validation/modules/smtp-probe/types';
import { MxProbeStatus } from '@mail-validation/modules/smtp-probe/enums/mx-probe-status.enum';
import { SmtpProbeInterface } from '@mail-validation/modules/smtp-probe/interfaces';

@Injectable()
export class SmtpProbeService implements SmtpProbeInterface {
  private readonly logger = new Logger(SmtpProbeService.name);

  constructor(
    private readonly cacheProvider: AbstractCacheProvider,
    private readonly domainResolver: DomainResolverService,
    private readonly smtpConnectionPool: SmtpConnectionPoolService,
    private readonly responseParser: SmtpResponseParserService,
    private readonly smtpProbeConfig: SmtpProbeConfigService,
  ) {}

  /**
   * Probe email deliverability for a given email address
   */
  async probeEmail(email: string): Promise<SmtpProbeResult> {
    const startTime = Date.now();
    const normalizedEmail = this.normalizeEmail(email);
    const domain = this.extractDomain(normalizedEmail);

    this.logger.debug(`Probing email deliverability for ${normalizedEmail}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(normalizedEmail);
      if (cached) {
        this.logger.debug(`Cache hit for ${normalizedEmail}`);
        return {
          ...cached,
          cached: true,
        };
      }

      // Get MX records for domain
      const dnsResult = await this.domainResolver.resolveDomain(domain);
      if (!dnsResult.hasValidMx || dnsResult.mxRecords.length === 0) {
        return this.createErrorResult(normalizedEmail, domain, 'No valid MX records found', startTime);
      }

      // Probe each MX server
      const mxResults = await this.probeAllMxServers(dnsResult.mxRecords, normalizedEmail);
      
      // Determine verdict and score
      const { verdict, score } = this.calculateVerdictAndScore(mxResults);
      
      const result: SmtpProbeResult = {
        domain,
        email: normalizedEmail,
        verdict,
        score,
        mxResults,
        totalResponseTime: Date.now() - startTime,
        timestamp: new Date(),
        cached: false,
      };

      // Cache the result
      await this.cacheResult(normalizedEmail, result);
      
      this.logger.debug(`SMTP probe completed for ${normalizedEmail}: ${verdict} (${score}/100)`);
      return result;
    } catch (error) {
      this.logger.error(`SMTP probe failed for ${normalizedEmail}:`, error);
      return this.createErrorResult(normalizedEmail, domain, error.message, startTime);
    }
  }

  /**
   * Probe specific MX server
   */
  async probeMxServer(mxHost: string, email: string): Promise<MxProbeResult> {
    const startTime = Date.now();
    const normalizedEmail = this.normalizeEmail(email);

    this.logger.debug(`Probing MX server ${mxHost} for ${normalizedEmail}`);

    let connection = null;
    try {
      // Get connection from pool
      connection = await this.smtpConnectionPool.getConnection({
        host: mxHost,
        port: this.smtpProbeConfig.smtpPort,
        timeout: this.smtpProbeConfig.defaultConnectionTimeout,
        useTls: false,
      });

      // Perform SMTP probe sequence
      const result = await this.performSmtpProbe(connection, normalizedEmail);
      
      if (!result.success) {
        return {
          mxHost,
          mxPriority: 0, // Will be set by caller
          status: MxProbeStatus.CONNECTION_ERROR,
          error: result.error,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      if (!result.response) {
        return {
          mxHost,
          mxPriority: 0,
          status: MxProbeStatus.INVALID_RESPONSE,
          error: 'No response received',
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      // Determine status based on response
      let status: MxProbeStatus;
      if (result.response.isSuccess) {
        status = MxProbeStatus.SUCCESS;
      } else if (result.response.isPermanentFailure) {
        status = MxProbeStatus.CONNECTION_ERROR;
      } else if (result.response.isTemporaryFailure) {
        status = MxProbeStatus.RATE_LIMITED;
      } else {
        status = MxProbeStatus.INVALID_RESPONSE;
      }

      return {
        mxHost,
        mxPriority: 0, // Will be set by caller
        status,
        response: result.response,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`MX probe failed for ${mxHost}:`, error);
      return {
        mxHost,
        mxPriority: 0,
        status: MxProbeStatus.CONNECTION_ERROR,
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } finally {
      // Return connection to pool
      if (connection) {
        await this.smtpConnectionPool.releaseConnection(connection);
      }
    }
  }

  /**
   * Get cached probe result
   */
  async getCachedResult(email: string): Promise<SmtpProbeResult | null> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const cacheKey = this.getCacheKey(normalizedEmail);
      const cached = await this.cacheProvider.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Failed to get cached result for ${email}:`, error);
      return null;
    }
  }

  /**
   * Clear probe cache
   */
  async clearCache(email?: string): Promise<void> {
    try {
      if (email) {
        const normalizedEmail = this.normalizeEmail(email);
        const cacheKey = this.getCacheKey(normalizedEmail);
        await this.cacheProvider.delete(cacheKey);
        this.logger.log(`Cleared cache for ${normalizedEmail}`);
      } else {
        // Clear all SMTP probe cache
        const iterator = this.cacheProvider.iterator();
        for await (const [key] of iterator) {
          if (key.startsWith(this.smtpProbeConfig.cacheKeyPrefix)) {
            await this.cacheProvider.delete(key);
          }
        }
        this.logger.log('Cleared all SMTP probe cache');
      }
    } catch (error) {
      this.logger.error('Failed to clear SMTP probe cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<SmtpProbeCacheStats> {
    try {
      const emails: string[] = [];
      const iterator = this.cacheProvider.iterator();
      
      for await (const [key] of iterator) {
        if (key.startsWith(this.smtpProbeConfig.cacheKeyPrefix)) {
          const email = key.replace(this.smtpProbeConfig.cacheKeyPrefix, '');
          emails.push(email);
        }
      }

      return {
        size: emails.length,
        emails,
      };
    } catch (error) {
      this.logger.warn('Failed to get SMTP probe cache stats:', error);
      return { size: 0, emails: [] };
    }
  }

  /**
   * Probe all MX servers for a domain (parallel processing)
   */
  private async probeAllMxServers(mxRecords: any[], email: string): Promise<MxProbeResult[]> {
    // Sort MX records by priority
    const sortedMxRecords = mxRecords.sort((a, b) => a.priority - b.priority);
    
    // Probe each MX server (limit to prevent abuse)
    const mxServersToProbe = sortedMxRecords.slice(0, this.smtpProbeConfig.maxProbesPerDomain);
    
    // Process MX servers in parallel with Promise.allSettled
    const probePromises = mxServersToProbe.map(async (mxRecord) => {
      const result = await this.probeMxServer(mxRecord.exchange, email);
      result.mxPriority = mxRecord.priority;
      return result;
    });

    const results = await Promise.allSettled(probePromises);
    
    // Extract successful results and handle failures
    const successfulResults: MxProbeResult[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        this.logger.warn(`MX probe failed: ${result.reason}`);
      }
    }
    
    return successfulResults;
  }

  /**
   * Perform an SMTP probe sequence using connection
   */
  private async performSmtpProbe(connection: any, email: string): Promise<any> {
    try {
      // Wait for greeting
      const greetingResult = await connection.sendCommand('');
      if (!greetingResult.success || !greetingResult.response) {
        return {
          success: false,
          error: 'Failed to receive server greeting',
        };
      }

      // Send EHLO
      const ehloResult = await connection.sendCommand(`EHLO ${this.smtpProbeConfig.fakeSender.split('@')[1]}`);
      if (!ehloResult.success || !ehloResult.response) {
        return {
          success: false,
          error: 'Failed to send EHLO command',
        };
      }

      // Send MAIL FROM
      const mailFromResult = await connection.sendCommand(`MAIL FROM:<${this.smtpProbeConfig.fakeSender}>`);
      if (!mailFromResult.success || !mailFromResult.response) {
        return {
          success: false,
          error: 'Failed to send MAIL FROM command',
        };
      }

      // Send RCPT TO (this is the key test)
      const rcptToResult = await connection.sendCommand(`RCPT TO:<${email}>`);
      
      // Send QUIT
      await connection.sendCommand('QUIT');
      
      return rcptToResult;
    } catch (error) {
      this.logger.error(`SMTP probe failed for ${email}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate verdict and score based on MX probe results
   */
  private calculateVerdictAndScore(mxResults: MxProbeResult[]): VerdictScore {
    if (mxResults.length === 0) {
      return { verdict: EmailVerdict.UNKNOWN, score: 0 };
    }

    const successCount = mxResults.filter(r => r.status === MxProbeStatus.SUCCESS).length;
    const failedCount = mxResults.filter(r => r.status === MxProbeStatus.CONNECTION_ERROR).length;
    const errorCount = mxResults.filter(r => r.status === MxProbeStatus.CONNECTION_ERROR).length;

    // If any MX server accepts the email, it's deliverable
    if (successCount > 0) {
      return { verdict: EmailVerdict.DELIVERABLE, score: 100 };
    }

    // If all MX servers reject the email, it's undeliverable
    if (failedCount > 0 && successCount === 0) {
      return { verdict: EmailVerdict.UNDELIVERABLE, score: 0 };
    }

    // If we have connection errors, it's unknown
    if (errorCount > 0) {
      return { verdict: EmailVerdict.UNKNOWN, score: 50 };
    }

    // Default to unknown
    return { verdict: EmailVerdict.UNKNOWN, score: 50 };
  }

  /**
   * Create error result
   */
  private createErrorResult(email: string, domain: string, error: string, startTime: number): SmtpProbeResult {
    return {
      domain,
      email,
      verdict: EmailVerdict.UNKNOWN,
      score: 0,
      mxResults: [],
      totalResponseTime: Date.now() - startTime,
      timestamp: new Date(),
      cached: false,
      error,
    };
  }

  /**
   * Cache probe result
   */
  private async cacheResult(email: string, result: SmtpProbeResult): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(email);
      await this.cacheProvider.set(cacheKey, JSON.stringify(result), this.smtpProbeConfig.cacheTtl);
    } catch (error) {
      this.logger.warn(`Failed to cache result for ${email}:`, error);
    }
  }

  /**
   * Get a cache key for email
   */
  private getCacheKey(email: string): string {
    return `${this.smtpProbeConfig.cacheKeyPrefix}${email}`;
  }

  /**
   * Normalize email address
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return parts[1];
  }
}
