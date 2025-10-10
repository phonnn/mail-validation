import { SmtpProbeResult, BatchSmtpProbeResult } from '@mail-validation/modules/smtp-probe/types/smtp-probe-result.type';
import { EmailShard } from '@mail-validation/modules/smtp-probe/types/email-batch.type';
import { SmtpProbeStats } from '@mail-validation/modules/smtp-probe/types/smtp-probe-stats.type';
import { SmtpSessionStats } from '@mail-validation/modules/smtp-probe/types/smtp-session.type';


export interface SmtpProbeInterface {
  /**
   * Probe a single email address
   */
  probeEmail(email: string): Promise<SmtpProbeResult>;

  /**
   * Probe multiple email addresses in batches
   */
  probeBatch(emails: string[]): Promise<BatchSmtpProbeResult>;

  /**
   * Probe emails sharded by MX host for optimal performance
   */
  probeShardedEmails(emailShards: EmailShard[]): Promise<BatchSmtpProbeResult>;

  /**
   * Get probe statistics
   */
  getProbeStats(): Promise<SmtpProbeStats>;

  /**
   * Clear probe cache if applicable
   */
  clearCache(): Promise<void>;
}

export interface MxShardingInterface {
  /**
   * Shard emails by their MX records for optimal batch processing
   */
  shardEmailsByMx(emails: string[]): Promise<EmailShard[]>;

  /**
   * Get MX records for a domain (with caching)
   */
  getMxRecords(domain: string): Promise<import('@mail-validation/modules/smtp-probe/types/email-batch.type').MxRecord[]>;
}

export interface SmtpSessionInterface {
  /**
   * Create and manage SMTP session with a specific MX host
   */
  createSession(mxHost: string): Promise<void>;

  /**
   * Probe multiple RCPT TO commands in a single session with PIPELINING
   */
  probeRcptBatch(emails: string[]): Promise<Array<{
    email: string;
    responseCode: string;
    responseMessage: string;
    responseTime: number;
  }>>;

  /**
   * Close the current session
   */
  closeSession(): Promise<void>;

  /**
   * Check if session is active
   */
  isActive(): boolean;

  /**
   * Get session statistics
   */
  getSessionStats(): SmtpSessionStats;
}
