import {
  JobBackoffConfig,
  ProbeStatus,
  SmtpProbeResult,
} from '@mail-validation/modules/smtp-probe';


/**
 * SMTP probe job data
 */
export interface SmtpProbeJobData {
  email: string;
  domain: string;
  requestId: string;
  clientId?: string; // For WebSocket client identification
  priority?: number; // Job priority (higher = more important)
  retryCount?: number;
  maxRetries?: number;
}

/**
 * SMTP probe job result
 */
export interface SmtpProbeJobResult {
  requestId: string;
  email: string;
  result: SmtpProbeResult;
  processingTime: number;
  workerId: string;
  timestamp: Date;
}

/**
 * SMTP probe job progress
 */
export interface SmtpProbeJobProgress {
  requestId: string;
  email: string;
  status: ProbeStatus;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
  timestamp: Date;
}

/**
 * SMTP probe job options
 */
export interface SmtpProbeJobOptions {
  delay?: number; // Delay before processing (ms)
  attempts?: number; // Max retry attempts
  backoff?: JobBackoffConfig;
  removeOnComplete?: number; // Keep N completed jobs
  removeOnFail?: number; // Keep N failed jobs
  priority?: number; // Job priority
}

