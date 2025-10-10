import { Injectable, Logger } from '@nestjs/common';
import { SmtpProbeInterface } from '@mail-validation/modules/smtp-probe/interfaces/smtp-probe.interface';
import { SmtpProbeStatus } from '@mail-validation/modules/smtp-probe/enums';
import { SMTP_CONSTANTS, SMTP_CATCH_ALL_INDICATORS } from '@mail-validation/modules/smtp-probe/constants/smtp.constants';
import { MxShardingService } from '@mail-validation/modules/smtp-probe/services/mx-sharding.service';
import { SmtpSessionService } from '@mail-validation/modules/smtp-probe/services/smtp-session.service';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import {
  BatchSmtpProbeResult,
  BatchStats,
  EmailShard,
  SmtpProbeResult,
  SmtpProbeStats,
} from '@mail-validation/modules/smtp-probe/types';

@Injectable()
export class SmtpProbeService implements SmtpProbeInterface {
  private readonly logger = new Logger(SmtpProbeService.name);
  private probeStats: SmtpProbeStats = {
    totalProbes: 0,
    successfulProbes: 0,
    failedProbes: 0,
    averageResponseTime: 0,
    activeConnections: 0,
  };

  constructor(
    private readonly mxShardingService: MxShardingService,
    private readonly smtpSessionService: SmtpSessionService,
    private readonly configService: SmtpProbeConfigService,
  ) {}

  /**
   * Probe a single email address
   */
  async probeEmail(email: string): Promise<SmtpProbeResult> {
    this.logger.debug(`Probing single email: ${email}`);
    const startTime = Date.now();

    try {
      // Shard the single email
      const shards = await this.mxShardingService.shardEmailsByMx([email]);
      
      if (shards.length === 0 || shards[0].mxRecords.length === 0) {
        return this.createErrorResult(email, 'No MX records found', startTime);
      }

      // Process the shard
      const batchResult = await this.probeShardedEmails(shards);
      
      if (batchResult.results.length > 0) {
        return batchResult.results[0];
      }

      return this.createErrorResult(email, 'No results returned', startTime);
    } catch (error) {
      this.logger.error(`Failed to probe email ${email}:`, error);
      return this.createErrorResult(email, error.message, startTime);
    }
  }

  /**
   * Probe multiple email addresses in batches
   */
  async probeBatch(emails: string[]): Promise<BatchSmtpProbeResult> {
    this.logger.debug(`Probing batch of ${emails.length} emails`);

    try {
      // Shard emails by MX records
      const shards = await this.mxShardingService.shardEmailsByMx(emails);
      
      // Process sharded emails
      return await this.probeShardedEmails(shards);
    } catch (error) {
      this.logger.error('Failed to probe batch:', error);
      throw error;
    }
  }

  /**
   * Probe emails sharded by MX host for optimal performance
   */
  async probeShardedEmails(emailShards: EmailShard[]): Promise<BatchSmtpProbeResult> {
    this.logger.debug(`Processing ${emailShards.length} email shards`);

    const startTime = Date.now();
    const allResults: SmtpProbeResult[] = [];
    const mxHosts: string[] = [];

    // Process each shard concurrently (up to maxConcurrentBatches limit)
    const batchPromises: Promise<SmtpProbeResult[]>[] = [];
    
    for (let i = 0; i < emailShards.length; i += this.configService.maxConcurrentBatches) {
      const shardBatch = emailShards.slice(i, i + this.configService.maxConcurrentBatches);
      
      const batchPromise = Promise.all(
        shardBatch.map(shard => this.processEmailShard(shard))
      ).then(results => results.flat());
      
      batchPromises.push(batchPromise);
    }

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten results
    for (const batchResult of batchResults) {
      allResults.push(...batchResult);
    }

    // Extract unique MX hosts
    const uniqueMxHosts = new Set<string>();
    for (const shard of emailShards) {
      for (const mxRecord of shard.mxRecords) {
        uniqueMxHosts.add(mxRecord.exchange);
      }
    }
    mxHosts.push(...Array.from(uniqueMxHosts));

    // Calculate statistics
    const totalTime = Date.now() - startTime;
    const stats = this.calculateBatchStats(allResults);

    // Update global probe statistics
    this.updateProbeStats(allResults);

    return {
      results: allResults,
      totalProcessed: allResults.length,
      totalValid: stats.valid,
      totalInvalid: stats.invalid,
      totalCatchAll: stats.catchAll,
      totalErrors: stats.errors,
      totalTime,
      mxHosts,
      averageResponseTime: stats.averageResponseTime,
    };
  }

  /**
   * Get probe statistics
   */
  async getProbeStats(): Promise<SmtpProbeStats> {
    return { ...this.probeStats };
  }

  /**
   * Clear probe cache if applicable
   */
  async clearCache(): Promise<void> {
    await this.mxShardingService.clearMxCache();
    this.logger.debug('SMTP probe cache cleared');
  }

  /**
   * Process a single email shard
   */
  private async processEmailShard(shard: EmailShard): Promise<SmtpProbeResult[]> {
    this.logger.debug(`Processing shard for domain ${shard.domain} with ${shard.emails.length} emails`);

    if (shard.mxRecords.length === 0) {
      // No MX records - all emails are invalid
      return shard.emails.map(email => 
        this.createErrorResult(email, 'No MX records found', Date.now())
      );
    }

    // Try each MX record in priority order
    for (const mxRecord of shard.mxRecords) {
      try {
        return await this.probeWithMxHost(shard.emails, mxRecord.exchange, mxRecord.priority);
      } catch (error) {
        this.logger.warn(`Failed to probe with MX ${mxRecord.exchange}:`, error);
        
        // If this is the last MX record, return error results
        if (mxRecord === shard.mxRecords[shard.mxRecords.length - 1]) {
          return shard.emails.map(email => 
            this.createErrorResult(email, `All MX hosts failed: ${error.message}`, Date.now())
          );
        }
      }
    }

    // Fallback - should not reach here
    return shard.emails.map(email => 
      this.createErrorResult(email, 'Unexpected error in MX processing', Date.now())
    );
  }

  /**
   * Probe emails with a specific MX host
   */
  private async probeWithMxHost(emails: string[], mxHost: string, mxPriority: number): Promise<SmtpProbeResult[]> {
    this.logger.debug(`Probing ${emails.length} emails with MX ${mxHost}`);

    try {
      // Create SMTP session
      await this.smtpSessionService.createSession(mxHost);
      this.probeStats.activeConnections++;

      // Process emails in batches
      const results: SmtpProbeResult[] = [];
      
      for (let i = 0; i < emails.length; i += this.configService.defaultBatchSize) {
        const emailBatch = emails.slice(i, i + this.configService.defaultBatchSize);
        
        // Probe RCPT commands
        const rcptResults = await this.smtpSessionService.probeRcptBatch(emailBatch);
        
        // Convert to SmtpProbeResult
        for (const rcptResult of rcptResults) {
          const result = this.convertRcptToProbeResult(
            rcptResult,
            mxHost,
            mxPriority,
            Date.now()
          );
          results.push(result);
        }
      }

      // Close session
      await this.smtpSessionService.closeSession();
      this.probeStats.activeConnections--;

      return results;
    } catch (error) {
      this.logger.error(`Failed to probe with MX ${mxHost}:`, error);
      
      // Ensure session is closed
      if (this.smtpSessionService.isActive()) {
        await this.smtpSessionService.closeSession();
        this.probeStats.activeConnections--;
      }
      
      throw error;
    }
  }

  /**
   * Convert RCPT result to SmtpProbeResult
   */
  private convertRcptToProbeResult(
    rcptResult: any,
    mxHost: string,
    mxPriority: number,
    startTime: number
  ): SmtpProbeResult {
    const { email, responseCode, responseMessage, responseTime } = rcptResult;
    
    const status = this.determineEmailStatus(responseCode, responseMessage);
    const probeTime = Date.now() - startTime;

    return {
      email,
      status,
      responseCode,
      responseMessage,
      mxHost,
      mxPriority,
      probeTime,
      responseTime,
      source: 'smtp_probe',
    };
  }

  /**
   * Determine email status based on SMTP response
   */
  private determineEmailStatus(responseCode: string, responseMessage: string): SmtpProbeStatus {
    const code = parseInt(responseCode, 10);

    // Success codes
    if (code >= SMTP_CONSTANTS.SUCCESS_CODE_MIN && code <= SMTP_CONSTANTS.SUCCESS_CODE_MAX) {
      // Check for catch-all indicators
      if (this.isCatchAllResponse(responseMessage)) {
        return SmtpProbeStatus.CATCH_ALL;
      }
      return SmtpProbeStatus.VALID;
    }

    // Temporary failure codes
    if (code >= SMTP_CONSTANTS.TEMPORARY_FAILURE_MIN && code <= SMTP_CONSTANTS.TEMPORARY_FAILURE_MAX) {
      if (code === 450 || code === 451 || code === 452) {
        return SmtpProbeStatus.TEMPORARY_FAILURE;
      }
      return SmtpProbeStatus.INVALID;
    }

    // Permanent failure codes
    if (code >= SMTP_CONSTANTS.PERMANENT_FAILURE_MIN && code <= SMTP_CONSTANTS.PERMANENT_FAILURE_MAX) {
      if (code === 550 || code === 551 || code === 552 || code === 553 || code === 554) {
        return SmtpProbeStatus.INVALID;
      }
      return SmtpProbeStatus.PERMANENT_FAILURE;
    }

    return SmtpProbeStatus.UNKNOWN;
  }

  /**
   * Check if response indicates catch-all behavior
   */
  private isCatchAllResponse(responseMessage: string): boolean {
    const message = responseMessage.toLowerCase();
    return SMTP_CATCH_ALL_INDICATORS.some(indicator => message.includes(indicator));
  }

  /**
   * Create error result
   */
  private createErrorResult(email: string, error: string, startTime: number): SmtpProbeResult {
    return {
      email,
      status: SmtpProbeStatus.ERROR,
      error,
      mxHost: undefined,
      mxPriority: undefined,
      probeTime: Date.now() - startTime,
      source: 'smtp_probe',
    };
  }

  /**
   * Calculate batch statistics
   */
  private calculateBatchStats(results: SmtpProbeResult[]): BatchStats {
    let valid = 0;
    let invalid = 0;
    let catchAll = 0;
    let errors = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const result of results) {
      switch (result.status) {
        case SmtpProbeStatus.VALID:
          valid++;
          break;
        case SmtpProbeStatus.INVALID:
        case SmtpProbeStatus.PERMANENT_FAILURE:
          invalid++;
          break;
        case SmtpProbeStatus.CATCH_ALL:
          catchAll++;
          break;
        case SmtpProbeStatus.ERROR:
        case SmtpProbeStatus.TIMEOUT:
          errors++;
          break;
      }

      if (result.responseTime) {
        totalResponseTime += result.responseTime;
        responseTimeCount++;
      }
    }

    return {
      valid,
      invalid,
      catchAll,
      errors,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
    };
  }

  /**
   * Update global probe statistics
   */
  private updateProbeStats(results: SmtpProbeResult[]): void {
    this.probeStats.totalProbes += results.length;
    
    let successful = 0;
    let failed = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const result of results) {
      if (result.status === SmtpProbeStatus.VALID || result.status === SmtpProbeStatus.CATCH_ALL) {
        successful++;
      } else {
        failed++;
      }

      if (result.responseTime) {
        totalResponseTime += result.responseTime;
        responseTimeCount++;
      }
    }

    this.probeStats.successfulProbes += successful;
    this.probeStats.failedProbes += failed;

    if (responseTimeCount > 0) {
      const currentTotal = this.probeStats.averageResponseTime * (this.probeStats.totalProbes - results.length);
      this.probeStats.averageResponseTime = (currentTotal + totalResponseTime) / this.probeStats.totalProbes;
    }
  }
}
