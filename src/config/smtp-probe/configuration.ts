import { registerAs } from '@nestjs/config';
import { SmtpProbeConfiguration } from './configuration.interface';
import { SMTP_CONSTANTS, SMTP_RETRYABLE_CODES } from '@mail-validation/modules/smtp-probe/constants/smtp.constants';
import { CONFIGURATION } from '@mail-validation/config/config.constants';
import { LogLevelEnum } from '@mail-validation/common/enums';

export default registerAs('smtpProbe', (): SmtpProbeConfiguration => ({
  session: {
    timeout: parseInt(process.env.SMTP_SESSION_TIMEOUT || SMTP_CONSTANTS.DEFAULT_SESSION_TIMEOUT.toString(), 10),
    maxRetries: parseInt(process.env.SMTP_MAX_RETRIES || SMTP_CONSTANTS.DEFAULT_MAX_RETRIES.toString(), 10),
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || SMTP_CONSTANTS.DEFAULT_CONNECTION_TIMEOUT.toString(), 10),
    commandTimeout: parseInt(process.env.SMTP_COMMAND_TIMEOUT || SMTP_CONSTANTS.DEFAULT_COMMAND_TIMEOUT.toString(), 10),
  },

  batch: {
    defaultSize: parseInt(process.env.SMTP_BATCH_DEFAULT_SIZE || SMTP_CONSTANTS.DEFAULT_BATCH_SIZE.toString(), 10),
    minSize: parseInt(process.env.SMTP_BATCH_MIN_SIZE || '10', 10),
    maxSize: parseInt(process.env.SMTP_BATCH_MAX_SIZE || '30', 10),
    enablePipelining: process.env.SMTP_ENABLE_PIPELINING === 'true',
    maxConcurrentBatches: parseInt(process.env.SMTP_MAX_CONCURRENT_BATCHES || SMTP_CONSTANTS.DEFAULT_MAX_CONCURRENT_BATCHES.toString(), 10),
  },

  mx: {
    cacheTtl: parseInt(process.env.SMTP_MX_CACHE_TTL || SMTP_CONSTANTS.DEFAULT_MX_CACHE_TTL.toString(), 10),
    maxMxRecords: parseInt(process.env.SMTP_MAX_MX_RECORDS || '10', 10),
    enableMxFallback: process.env.SMTP_ENABLE_MX_FALLBACK === 'true',
  },

  retry: {
    maxRetries: parseInt(process.env.SMTP_RETRY_MAX_RETRIES || SMTP_CONSTANTS.DEFAULT_MAX_RETRIES.toString(), 10),
    baseDelay: parseInt(process.env.SMTP_RETRY_BASE_DELAY || SMTP_CONSTANTS.DEFAULT_BASE_DELAY.toString(), 10),
    maxDelay: parseInt(process.env.SMTP_RETRY_MAX_DELAY || SMTP_CONSTANTS.DEFAULT_MAX_DELAY.toString(), 10),
    retryableCodes: (process.env.SMTP_RETRYABLE_CODES || SMTP_RETRYABLE_CODES.join(',')).split(','),
  },

  tls: {
    enabled: process.env.SMTP_TLS_ENABLED === 'true',
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    minVersion: process.env.SMTP_TLS_MIN_VERSION || SMTP_CONSTANTS.TLS_MIN_VERSION,
    maxVersion: process.env.SMTP_TLS_MAX_VERSION || SMTP_CONSTANTS.TLS_MAX_VERSION,
  },

  logging: {
    logLevel: (process.env.SMTP_LOG_LEVEL || CONFIGURATION.DEFAULT_LOG_LEVEL) as LogLevelEnum,
  },
}));
