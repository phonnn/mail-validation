import { JobStatusInfo } from '@mail-validation/modules/smtp-probe/types/job-status.type';
import { JobStatus } from '@mail-validation/modules/smtp-probe/enums/job-status.enum';

/**
 * Response DTO for job status
 */
export class JobStatusResponseDto implements JobStatusInfo {
  requestId: string;
  status: JobStatus;
  progress: number;
  data?: any;
  error?: string;
  createdAt?: Date;
  processedAt?: Date;
  finishedAt?: Date;

  constructor(data: JobStatusInfo) {
    this.requestId = data.requestId;
    this.status = data.status;
    this.progress = data.progress;
    this.data = data.data;
    this.error = data.error;
    this.createdAt = data.createdAt;
    this.processedAt = data.processedAt;
    this.finishedAt = data.finishedAt;
  }
}
