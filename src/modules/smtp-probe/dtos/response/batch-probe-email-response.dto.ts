import { BatchEmailResult } from '@mail-validation/modules/smtp-probe/types/batch-processing-result.type';
import { ProbeStatus } from '@mail-validation/modules/smtp-probe/enums/probe-status.enum';

export class BatchProbeEmailResponseDto {
  batchId: string;
  totalEmails: number;
  queuedEmails: number;
  failedEmails: number;
  status: ProbeStatus;
  message: string;
  estimatedTime?: number;
  results?: BatchEmailResult[];

  constructor(data: Partial<BatchProbeEmailResponseDto>) {
    Object.assign(this, data);
  }
}
