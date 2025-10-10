/**
 * Response DTO for email probe submission
 */
export class ProbeEmailResponseDto {
  requestId: string;
  jobId: string;
  status: string;
  message: string;
  estimatedTime?: number;

  constructor(data: {
    requestId: string;
    jobId: string;
    status: string;
    message: string;
    estimatedTime?: number;
  }) {
    this.requestId = data.requestId;
    this.jobId = data.jobId;
    this.status = data.status;
    this.message = data.message;
    this.estimatedTime = data.estimatedTime;
  }
}


