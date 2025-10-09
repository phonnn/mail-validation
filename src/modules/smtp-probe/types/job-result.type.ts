/**
 * Job operation result type
 */
export interface JobResult {
  requestId?: string;
  jobId?: string;
  success: boolean;
  message: string;
}

