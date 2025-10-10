import { LogLevelEnum } from '@mail-validation/common/enums';

export interface SmtpProbeConfiguration {
  // Session configuration
  session: {
    timeout: number;
    maxRetries: number;
    maxConnections: number;
    connectionTimeout: number;
    commandTimeout: number;
  };

  // Batch processing configuration
  batch: {
    defaultSize: number;
    minSize: number;
    maxSize: number;
    enablePipelining: boolean;
    maxConcurrentBatches: number;
  };

  // MX resolution configuration
  mx: {
    cacheTtl: number;
    maxMxRecords: number;
    enableMxFallback: boolean;
  };

  // Retry configuration
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryableCodes: string[];
  };

  // TLS configuration
  tls: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    minVersion: string;
    maxVersion: string;
  };

  // Logging configuration
  logging: {
    logLevel: LogLevelEnum;
  };
}
