import { registerAs } from '@nestjs/config';
import { CONFIGURATION } from '@mail-validation/config/config.constants';

export interface SmtpProbeConfigurationInterface {
  maxConnectionsPerHost?: number;
  connectionTimeout?: number;
  responseTimeout?: number;
  cacheTtl?: number;
  maxProbesPerDomain?: number;
  maxProbesPerMx?: number;
  rateLimitWindow?: number;
  fakeSender?: string;
  maxResponseLength?: number;
  defaultTimeout?: number;
  defaultReadTimeout?: number;
  defaultConnectionTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffMultiplier?: number;
  smtpPort?: number;
  submissionPort?: number;
  smtpsPort?: number;
  cacheKeyPrefix?: string;
  // High concurrency settings
  maxConcurrentJobs?: number;
  maxConcurrentConnections?: number;
  connectionPoolSize?: number;
  queueConcurrency?: number;
  batchSize?: number;
  maxBatchSize?: number;
  // Rate limiting
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
  maxEmailsPerUser?: number;
  // Performance tuning
  keepAliveTimeout?: number;
  maxIdleConnections?: number;
  connectionReuseTimeout?: number;
  // Advanced SMTP optimization
  enableMxSharding?: boolean;
  enablePipelining?: boolean;
  maxRcptPerSession?: number;
  globalRcptRateLimit?: number;
  perMxRcptRateLimit?: number;
  enableIpWarmup?: boolean;
  warmupInitialLevel?: number;
  warmupSuccessThreshold?: number;
  // TCP optimization
  tcpNoDelay?: boolean;
  tcpKeepAlive?: boolean;
  tcpKeepAliveInitialDelay?: number;
  socketBufferSize?: number;
  // IP hygiene
  enableReverseDns?: boolean;
  enableSpfCheck?: boolean;
  enableBlacklistCheck?: boolean;
  maxConcurrentSessions?: number;
}

/**
 * SMTP Probe configuration
 */
export default registerAs(
  CONFIGURATION.KEY_SMTP_PROBE,
  (): SmtpProbeConfigurationInterface => ({
    // Basic settings
    maxConnectionsPerHost: +process.env.SMTP_PROBE_MAX_CONNECTIONS_PER_HOST || 50,
    connectionTimeout: +process.env.SMTP_PROBE_CONNECTION_TIMEOUT || 10000,
    responseTimeout: +process.env.SMTP_PROBE_RESPONSE_TIMEOUT || 5000,
    cacheTtl: +process.env.SMTP_PROBE_CACHE_TTL || 3600,
    maxProbesPerDomain: +process.env.SMTP_PROBE_MAX_PROBES_PER_DOMAIN || 10,
    maxProbesPerMx: +process.env.SMTP_PROBE_MAX_PROBES_PER_MX || 5,
    rateLimitWindow: +process.env.SMTP_PROBE_RATE_LIMIT_WINDOW || 60000,
    fakeSender: process.env.SMTP_PROBE_FAKE_SENDER || 'test@example.com',
    maxResponseLength: +process.env.SMTP_PROBE_MAX_RESPONSE_LENGTH || 512,
    defaultTimeout: +process.env.SMTP_PROBE_DEFAULT_TIMEOUT || 15000,
    defaultReadTimeout: +process.env.SMTP_PROBE_DEFAULT_READ_TIMEOUT || 5000,
    defaultConnectionTimeout: +process.env.SMTP_PROBE_DEFAULT_CONNECTION_TIMEOUT || 10000,
    maxRetries: +process.env.SMTP_PROBE_MAX_RETRIES || 2,
    retryDelay: +process.env.SMTP_PROBE_RETRY_DELAY || 500,
    retryBackoffMultiplier: +process.env.SMTP_PROBE_RETRY_BACKOFF_MULTIPLIER || 2,
    smtpPort: +process.env.SMTP_PROBE_SMTP_PORT || 25,
    submissionPort: +process.env.SMTP_PROBE_SUBMISSION_PORT || 587,
    smtpsPort: +process.env.SMTP_PROBE_SMTPS_PORT || 465,
    cacheKeyPrefix: process.env.SMTP_PROBE_CACHE_KEY_PREFIX || 'smtp:probe:',
    
    // High concurrency settings for 1000 users
    maxConcurrentJobs: +process.env.SMTP_PROBE_MAX_CONCURRENT_JOBS || 500,
    maxConcurrentConnections: +process.env.SMTP_PROBE_MAX_CONCURRENT_CONNECTIONS || 1000,
    connectionPoolSize: +process.env.SMTP_PROBE_CONNECTION_POOL_SIZE || 200,
    queueConcurrency: +process.env.SMTP_PROBE_QUEUE_CONCURRENCY || 100,
    batchSize: +process.env.SMTP_PROBE_BATCH_SIZE || 50,
    maxBatchSize: +process.env.SMTP_PROBE_MAX_BATCH_SIZE || 100,
    
    // Rate limiting for abuse prevention
    maxRequestsPerMinute: +process.env.SMTP_PROBE_MAX_REQUESTS_PER_MINUTE || 100,
    maxRequestsPerHour: +process.env.SMTP_PROBE_MAX_REQUESTS_PER_HOUR || 1000,
    maxEmailsPerUser: +process.env.SMTP_PROBE_MAX_EMAILS_PER_USER || 1000,
    
    // Performance tuning
    keepAliveTimeout: +process.env.SMTP_PROBE_KEEP_ALIVE_TIMEOUT || 30000,
    maxIdleConnections: +process.env.SMTP_PROBE_MAX_IDLE_CONNECTIONS || 50,
    connectionReuseTimeout: +process.env.SMTP_PROBE_CONNECTION_REUSE_TIMEOUT || 60000,
    
    // Advanced SMTP optimization
    enableMxSharding: process.env.SMTP_PROBE_ENABLE_MX_SHARDING === 'true',
    enablePipelining: process.env.SMTP_PROBE_ENABLE_PIPELINING === 'true',
    maxRcptPerSession: +process.env.SMTP_PROBE_MAX_RCPT_PER_SESSION || 30,
    globalRcptRateLimit: +process.env.SMTP_PROBE_GLOBAL_RCPT_RATE_LIMIT || 1000,
    perMxRcptRateLimit: +process.env.SMTP_PROBE_PER_MX_RCPT_RATE_LIMIT || 100,
    enableIpWarmup: process.env.SMTP_PROBE_ENABLE_IP_WARMUP === 'true',
    warmupInitialLevel: +process.env.SMTP_PROBE_WARMUP_INITIAL_LEVEL || 1,
    warmupSuccessThreshold: +process.env.SMTP_PROBE_WARMUP_SUCCESS_THRESHOLD || 0.95,
    
    // TCP optimization
    tcpNoDelay: process.env.SMTP_PROBE_TCP_NO_DELAY === 'true',
    tcpKeepAlive: process.env.SMTP_PROBE_TCP_KEEP_ALIVE === 'true',
    tcpKeepAliveInitialDelay: +process.env.SMTP_PROBE_TCP_KEEP_ALIVE_INITIAL_DELAY || 1000,
    socketBufferSize: +process.env.SMTP_PROBE_SOCKET_BUFFER_SIZE || 65536,
    
    // IP hygiene
    enableReverseDns: process.env.SMTP_PROBE_ENABLE_REVERSE_DNS === 'true',
    enableSpfCheck: process.env.SMTP_PROBE_ENABLE_SPF_CHECK === 'true',
    enableBlacklistCheck: process.env.SMTP_PROBE_ENABLE_BLACKLIST_CHECK === 'true',
    maxConcurrentSessions: +process.env.SMTP_PROBE_MAX_CONCURRENT_SESSIONS || 200,
  }),
);

