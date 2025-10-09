import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpProbeConfigurationInterface } from './configuration';
import { CONFIGURATION } from '@mail-validation/config/config.constants';

/**
 * Service dealing with SMTP probe config-based operations.
 *
 * @class
 */
@Injectable()
export class SmtpProbeConfigService implements SmtpProbeConfigurationInterface {
  constructor(private readonly _configService: ConfigService) {}

  get maxConnectionsPerHost(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_MAX_CONNECTIONS_PER_HOST,
    );
  }

  get connectionTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_CONNECTION_TIMEOUT,
    );
  }

  get responseTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_RESPONSE_TIMEOUT,
    );
  }

  get cacheTtl(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_CACHE_TTL,
    );
  }

  get maxProbesPerDomain(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_MAX_PROBES_PER_DOMAIN,
    );
  }

  get maxProbesPerMx(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_MAX_PROBES_PER_MX,
    );
  }

  get rateLimitWindow(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_RATE_LIMIT_WINDOW,
    );
  }

  get fakeSender(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_FAKE_SENDER,
    );
  }

  get maxResponseLength(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_MAX_RESPONSE_LENGTH,
    );
  }

  get defaultTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_DEFAULT_TIMEOUT,
    );
  }

  get defaultReadTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_DEFAULT_READ_TIMEOUT,
    );
  }

  get defaultConnectionTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_DEFAULT_CONNECTION_TIMEOUT,
    );
  }

  get maxRetries(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_MAX_RETRIES,
    );
  }

  get retryDelay(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_RETRY_DELAY,
    );
  }

  get retryBackoffMultiplier(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_RETRY_BACKOFF_MULTIPLIER,
    );
  }

  get smtpPort(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_SMTP_PORT,
    );
  }

  get submissionPort(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_SUBMISSION_PORT,
    );
  }

  get smtpsPort(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_SMTPS_PORT,
    );
  }

  get cacheKeyPrefix(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_SMTP_PROBE + '.' + CONFIGURATION.KEY_SMTP_PROBE_CACHE_KEY_PREFIX,
    );
  }

  // High concurrency settings
  get maxConcurrentJobs(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxConcurrentJobs',
    );
  }

  get maxConcurrentConnections(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxConcurrentConnections',
    );
  }

  get connectionPoolSize(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.connectionPoolSize',
    );
  }

  get queueConcurrency(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.queueConcurrency',
    );
  }

  get batchSize(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.batchSize',
    );
  }

  get maxBatchSize(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxBatchSize',
    );
  }

  // Rate limiting
  get maxRequestsPerMinute(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxRequestsPerMinute',
    );
  }

  get maxRequestsPerHour(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxRequestsPerHour',
    );
  }

  get maxEmailsPerUser(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxEmailsPerUser',
    );
  }

  // Performance tuning
  get keepAliveTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.keepAliveTimeout',
    );
  }

  get maxIdleConnections(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxIdleConnections',
    );
  }

  get connectionReuseTimeout(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.connectionReuseTimeout',
    );
  }

  // Advanced SMTP optimization
  get enableMxSharding(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enableMxSharding',
    );
  }

  get enablePipelining(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enablePipelining',
    );
  }

  get maxRcptPerSession(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxRcptPerSession',
    );
  }

  get globalRcptRateLimit(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.globalRcptRateLimit',
    );
  }

  get perMxRcptRateLimit(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.perMxRcptRateLimit',
    );
  }

  get enableIpWarmup(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enableIpWarmup',
    );
  }

  get warmupInitialLevel(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.warmupInitialLevel',
    );
  }

  get warmupSuccessThreshold(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.warmupSuccessThreshold',
    );
  }

  // TCP optimization
  get tcpNoDelay(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.tcpNoDelay',
    );
  }

  get tcpKeepAlive(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.tcpKeepAlive',
    );
  }

  get tcpKeepAliveInitialDelay(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.tcpKeepAliveInitialDelay',
    );
  }

  get socketBufferSize(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.socketBufferSize',
    );
  }

  // IP hygiene
  get enableReverseDns(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enableReverseDns',
    );
  }

  get enableSpfCheck(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enableSpfCheck',
    );
  }

  get enableBlacklistCheck(): boolean {
    return this._configService.get<boolean>(
      CONFIGURATION.KEY_SMTP_PROBE + '.enableBlacklistCheck',
    );
  }

  get maxConcurrentSessions(): number {
    return this._configService.get<number>(
      CONFIGURATION.KEY_SMTP_PROBE + '.maxConcurrentSessions',
    );
  }
}

