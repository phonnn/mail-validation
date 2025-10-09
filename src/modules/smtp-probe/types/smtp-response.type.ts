import { SmtpResponseCategory } from '@mail-validation/modules/smtp-probe/enums';

/**
 * Parsed SMTP response
 */
export interface SmtpResponse {
  code: number;
  message: string;
  category: SmtpResponseCategory;
  isSuccess: boolean;
  isTemporaryFailure: boolean;
  isPermanentFailure: boolean;
}

/**
 * SMTP command result
 */
export interface SmtpCommandResult {
  success: boolean;
  response?: SmtpResponse;
  error?: string;
}

