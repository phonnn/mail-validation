import { JobStatus } from '@mail-validation/modules/smtp-probe';

/**
 * Job status information for individual jobs
 */
export interface JobStatusInfo {
  requestId: string;
  status: JobStatus;
  progress: number;
  data?: any;
  error?: string;
  createdAt?: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

