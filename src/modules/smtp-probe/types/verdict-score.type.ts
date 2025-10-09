import { EmailVerdict } from '@mail-validation/modules/smtp-probe/enums';

/**
 * Email deliverability verdict and score
 */
export interface VerdictScore {
  verdict: EmailVerdict;
  score: number;
}

