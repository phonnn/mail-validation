export const SMTP_CONSTANTS = {
  // Default ports
  DEFAULT_SMTP_PORT: 25,

  // Timeouts (in milliseconds)
  DEFAULT_SESSION_TIMEOUT: 30000,
  DEFAULT_CONNECTION_TIMEOUT: 10000,
  DEFAULT_COMMAND_TIMEOUT: 5000,

  // Retry configuration
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BASE_DELAY: 1000,
  DEFAULT_MAX_DELAY: 10000,

  // Batch processing
  DEFAULT_BATCH_SIZE: 20,
  DEFAULT_MAX_CONCURRENT_BATCHES: 5,

  // MX resolution
  DEFAULT_MX_CACHE_TTL: 3600, // 1 hour in seconds

  // Cache keys
  MX_CACHE_KEY_PREFIX: 'mx:',

  // SMTP commands
  SMTP_COMMANDS: {
    PIPELINING: 'PIPELINING',
    STARTTLS: 'STARTTLS',
    QUIT: 'QUIT',
  },

  // SMTP response codes
  SUCCESS_CODE_MIN: 200,
  SUCCESS_CODE_MAX: 299,
  TEMPORARY_FAILURE_MIN: 400,
  TEMPORARY_FAILURE_MAX: 499,
  PERMANENT_FAILURE_MIN: 500,
  PERMANENT_FAILURE_MAX: 599,

  // TLS versions
  TLS_MIN_VERSION: 'TLSv1.2',
  TLS_MAX_VERSION: 'TLSv1.3',

  // Default sender for testing - using a real domain to avoid rejection
  DEFAULT_SENDER: 'k79pro@gmail.com',

} as const;

export const SMTP_RETRYABLE_CODES = [
  '450',
  '451',
  '452',
  '503',
  '521',
] as const;

export const SMTP_CATCH_ALL_INDICATORS = [
  'catch-all',
  'catch all',
  'accept all',
  'accept-all',
  'deliverable',
  'relay',
] as const;
