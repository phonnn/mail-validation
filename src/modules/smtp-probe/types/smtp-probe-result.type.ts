import { SmtpResponseCode, SmtpProbeStatus } from '@mail-validation/modules/smtp-probe/enums';

export interface SmtpProbeResult {
  email: string;
  status: SmtpProbeStatus;
  responseCode?: SmtpResponseCode;
  responseMessage?: string;
  mxHost?: string;
  mxPriority?: number;
  probeTime: number;
  responseTime?: number;
  error?: string;
  isCatchAll?: boolean;
  source: 'smtp_probe';
}

export interface BatchSmtpProbeResult {
  results: SmtpProbeResult[];
  totalProcessed: number;
  totalValid: number;
  totalInvalid: number;
  totalCatchAll: number;
  totalErrors: number;
  totalTime: number;
  mxHosts: string[];
  averageResponseTime: number;
}
