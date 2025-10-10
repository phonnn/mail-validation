import { SmtpProbeResult, BatchSmtpProbeResult } from '@mail-validation/modules/smtp-probe/types/smtp-probe-result.type';
import { SmtpProbeStats } from '@mail-validation/modules/smtp-probe/types/smtp-probe-stats.type';

export class SmtpProbeResponseDto {
  success: boolean;
  data?: SmtpProbeResult;
  error?: string;
}

export class BatchSmtpProbeResponseDto {
  success: boolean;
  data?: BatchSmtpProbeResult;
  error?: string;
}

export class SmtpProbeStatsResponseDto {
  success: boolean;
  data?: SmtpProbeStats;
  error?: string;
}

export class ClearCacheResponseDto {
  success: boolean;
  message?: string;
  error?: string;
}
