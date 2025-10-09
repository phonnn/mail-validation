import { SmtpProbeResult, MxProbeResult, SmtpProbeCacheStats } from '@mail-validation/modules/smtp-probe/types';

/**
 * SMTP probe service interface
 */
export interface SmtpProbeInterface {
  /**
   * Probe email deliverability for a given email address
   */
  probeEmail(email: string): Promise<SmtpProbeResult>;
  
  /**
   * Probe specific MX server
   */
  probeMxServer(mxHost: string, email: string): Promise<MxProbeResult>;
  
  /**
   * Get cached probe result
   */
  getCachedResult(email: string): Promise<SmtpProbeResult | null>;
  
  /**
   * Clear probe cache
   */
  clearCache(email?: string): Promise<void>;
  
  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<SmtpProbeCacheStats>;
}
