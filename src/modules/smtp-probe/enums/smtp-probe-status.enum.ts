/**
 * SMTP probe status for email validation results
 */
export enum SmtpProbeStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  CATCH_ALL = 'catch_all',
  UNKNOWN = 'unknown',
  TEMPORARY_FAILURE = 'temporary_failure',
  PERMANENT_FAILURE = 'permanent_failure',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}
