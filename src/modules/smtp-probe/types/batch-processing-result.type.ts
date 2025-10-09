import {
  EmailResultStatus,
  SmtpProbeResult,
} from '@mail-validation/modules/smtp-probe';

/**
 * Individual email result within a batch
 */
export interface BatchEmailResult {
  email: string;
  requestId: string;
  result: SmtpProbeResult | null;
  status: EmailResultStatus;
  error?: string;
}

/**
 * Batch processing progress tracking
 */
export interface BatchProcessingProgress {
  batchId: string;
  totalEmails: number;
  processedEmails: number;
  completedEmails: number;
  failedEmails: number;
  progress: number; // 0-100
  currentEmail?: string;
  message: string;
  timestamp: Date;
}

/**
 * Batch processing statistics
 */
export interface BatchProcessingStats {
  completedEmails: number;
  failedEmails: number;
  processingTime: number;
  averageTimePerEmail: number;
}
