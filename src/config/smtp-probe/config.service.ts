import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpProbeConfiguration } from './configuration.interface';
import { LogLevelEnum } from '@mail-validation/common/enums';

@Injectable()
export class SmtpProbeConfigService {
  constructor(private readonly configService: ConfigService) {}

  get config(): SmtpProbeConfiguration {
    return this.configService.get<SmtpProbeConfiguration>('smtpProbe')!;
  }

  get sessionTimeout(): number {
    return this.config.session.timeout;
  }

  get maxRetries(): number {
    return this.config.session.maxRetries;
  }

  get maxConnections(): number {
    return this.config.session.maxConnections;
  }

  get connectionTimeout(): number {
    return this.config.session.connectionTimeout;
  }

  get commandTimeout(): number {
    return this.config.session.commandTimeout;
  }

  get defaultBatchSize(): number {
    return this.config.batch.defaultSize;
  }

  get minBatchSize(): number {
    return this.config.batch.minSize;
  }

  get maxBatchSize(): number {
    return this.config.batch.maxSize;
  }

  get enablePipelining(): boolean {
    return this.config.batch.enablePipelining;
  }

  get maxConcurrentBatches(): number {
    return this.config.batch.maxConcurrentBatches;
  }

  get mxCacheTtl(): number {
    return this.config.mx.cacheTtl;
  }

  get maxMxRecords(): number {
    return this.config.mx.maxMxRecords;
  }

  get enableMxFallback(): boolean {
    return this.config.mx.enableMxFallback;
  }

  get retryMaxRetries(): number {
    return this.config.retry.maxRetries;
  }

  get retryBaseDelay(): number {
    return this.config.retry.baseDelay;
  }

  get retryMaxDelay(): number {
    return this.config.retry.maxDelay;
  }

  get retryableCodes(): string[] {
    return this.config.retry.retryableCodes;
  }

  get tlsEnabled(): boolean {
    return this.config.tls.enabled;
  }

  get tlsRejectUnauthorized(): boolean {
    return this.config.tls.rejectUnauthorized;
  }

  get tlsMinVersion(): string {
    return this.config.tls.minVersion;
  }

  get tlsMaxVersion(): string {
    return this.config.tls.maxVersion;
  }

  get logLevel(): LogLevelEnum {
    return this.config.logging.logLevel;
  }
}
