/**
 * SMTP response codes for email validation
 */
export enum SmtpResponseCode {
  // Success codes
  OK = '250',
  SERVICE_READY = '220',
  AUTH_SUCCESS = '235',

  // Temporary failure codes
  MAILBOX_UNAVAILABLE = '450',
  ACTION_ABORTED = '451',
  INSUFFICIENT_STORAGE = '452',
  SERVICE_UNAVAILABLE = '421',

  // Permanent failure codes
  SYNTAX_ERROR = '500',
  SYNTAX_ERROR_ARGUMENTS = '501',
  COMMAND_NOT_IMPLEMENTED = '502',
  BAD_SEQUENCE = '503',
  MAILBOX_NOT_FOUND = '550',
  USER_NOT_LOCAL = '551',
  EXCEEDED_STORAGE = '552',
  INVALID_MAILBOX_NAME = '553',
  TRANSACTION_FAILED = '554',
}
