import {
  BatchEmailResult,
  EmailDataWithRequestId,
} from '@mail-validation/modules/smtp-probe';


export interface BatchProbeJobData {
  batchId: string;
  emails: EmailDataWithRequestId[];
  totalEmails: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

export interface BatchProbeJobResult {
  batchId: string;
  totalEmails: number;
  completedEmails: number;
  failedEmails: number;
  results: BatchEmailResult[];
  processingTime: number;
  timestamp: Date;
}

