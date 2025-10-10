/**
 * SMTP response codes and their meanings
 */
export enum SmtpResponseCode {
  // 2xx - Success
  SYSTEM_STATUS = 211,
  HELP_MESSAGE = 214,
  SERVICE_READY = 220,
  SERVICE_CLOSING = 221,
  AUTH_SUCCESS = 235,
  OK = 250,
  
  // 3xx - Intermediate
  START_MAIL_INPUT = 354,
  
  // 4xx - Temporary failure
  SERVICE_UNAVAILABLE = 421,
  MAILBOX_UNAVAILABLE = 450,
  LOCAL_ERROR = 451,
  INSUFFICIENT_STORAGE = 452,
  
  // 5xx - Permanent failure
  SYNTAX_ERROR = 500,
  SYNTAX_ERROR_PARAM = 501,
  COMMAND_NOT_IMPLEMENTED = 502,
  BAD_SEQUENCE = 503,
  PARAMETER_NOT_IMPLEMENTED = 504,
  MAILBOX_UNAVAILABLE_PERM = 550,
  USER_NOT_LOCAL = 551,
  EXCEEDED_STORAGE = 552,
  MAILBOX_NAME_NOT_ALLOWED = 553,
  TRANSACTION_FAILED = 554,
}

/**
 * SMTP response categories
 */
export enum SmtpResponseCategory {
  SUCCESS = 'success',
  TEMPORARY_FAILURE = 'temporary_failure',
  PERMANENT_FAILURE = 'permanent_failure',
  UNKNOWN = 'unknown',
}



