import { MxProbeStatus, EmailVerdict } from '@mail-validation/modules/smtp-probe/enums';
import { SmtpResponse } from '@mail-validation/modules/smtp-probe/types/smtp-response.type';

/**
 * Individual MX server probe result
 */
export interface MxProbeResult {
  mxHost: string;
  mxPriority: number;
  status: MxProbeStatus;
  response?: SmtpResponse;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

/**
 * Complete SMTP probe result for a domain
 */
export interface SmtpProbeResult {
  domain: string;
  email: string;
  verdict: EmailVerdict;
  score: number; // 0-100
  mxResults: MxProbeResult[];
  totalResponseTime: number;
  timestamp: Date;
  cached: boolean;
  error?: string;
}

