import { BackoffType } from '@mail-validation/modules/smtp-probe';

/**
 * Backoff configuration for job retries
 */
export interface JobBackoffConfig {
  type: BackoffType;
  delay: number;
}

/**
 * Bull queue job options type
 */
export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: JobBackoffConfig;
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  priority?: number;
}

/**
 * Default queue job options
 */
export interface DefaultQueueJobOptions {
  delay: number;
  attempts: number;
  backoff: JobBackoffConfig;
  removeOnComplete: number;
  removeOnFail: number;
  priority: number;
}

