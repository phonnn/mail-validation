import { JobResult } from '@mail-validation/modules/smtp-probe/types/job-result.type';

/**
 * Response DTO for job operations (cancel, pause, resume, etc.)
 */
export class JobResultResponseDto implements JobResult {
  requestId?: string;
  jobId?: string;
  success: boolean;
  message: string;

  constructor(data: JobResult) {
    this.requestId = data.requestId;
    this.jobId = data.jobId;
    this.success = data.success;
    this.message = data.message;
  }
}
