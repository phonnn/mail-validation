import { DEFAULT_URLS, NETWORK_CONSTANTS } from '@mail-validation/common/constants';

export const CONFIGURATION = {
  DEFAULT_APP: 'mail-validation',
  DEFAULT_URL: DEFAULT_URLS.APP_URL,
  DEFAULT_PORT: NETWORK_CONSTANTS.DEFAULT_APP_PORT.toString(),

  // App Keywords
  KEY_APP: 'app',
  KEY_NAME: 'name',
  KEY_ENV: 'env',
  KEY_URL: 'url',
  KEY_PORT: 'port',

  // Database Keywords
  KEY_DATABASE: 'database',
  KEY_DATABASE_NAME: 'database',
  KEY_DATABASE_TYPE: 'type',
  KEY_DATABASE_HOST: 'host',
  KEY_DATABASE_PORT: 'port',
  KEY_DATABASE_USERNAME: 'username',
  KEY_DATABASE_PASSWORD: 'password',
  KEY_DATABASE_SYNCHRONIZE: 'synchronize',
  KEY_DATABASE_AUTOLOAD_ENTITIES: 'autoLoadEntities',
  KEY_DATABASE_DRIVER: 'driver',

  // Database values
  DATABASE_TYPE_POSTGRES: 'postgres',

  // Auth Keys
  KEY_AUTH: 'auth',
  KEY_AUTH_JWT_SECRET: 'jwtSecret',
  KEY_AUTH_JWT_EXPIRED: 'jwtExpired',
  KEY_AUTH_SALT_SIZE: 'saltSize',

  // Auth Defaults
  DEFAULT_JWT_SECRET: 'super-secret',
  DEFAULT_JWT_EXPIRED: 3600,
  DEFAULT_SALT_SIZE: 10,

  // SMTP Probe Keywords
  KEY_SMTP_PROBE: 'smtpProbe',
  KEY_SMTP_PROBE_MAX_CONNECTIONS_PER_HOST: 'maxConnectionsPerHost',
  KEY_SMTP_PROBE_CONNECTION_TIMEOUT: 'connectionTimeout',
  KEY_SMTP_PROBE_RESPONSE_TIMEOUT: 'responseTimeout',
  KEY_SMTP_PROBE_CACHE_TTL: 'cacheTtl',
  KEY_SMTP_PROBE_MAX_PROBES_PER_DOMAIN: 'maxProbesPerDomain',
  KEY_SMTP_PROBE_MAX_PROBES_PER_MX: 'maxProbesPerMx',
  KEY_SMTP_PROBE_RATE_LIMIT_WINDOW: 'rateLimitWindow',
  KEY_SMTP_PROBE_FAKE_SENDER: 'fakeSender',
  KEY_SMTP_PROBE_MAX_RESPONSE_LENGTH: 'maxResponseLength',
  KEY_SMTP_PROBE_DEFAULT_TIMEOUT: 'defaultTimeout',
  KEY_SMTP_PROBE_DEFAULT_READ_TIMEOUT: 'defaultReadTimeout',
  KEY_SMTP_PROBE_DEFAULT_CONNECTION_TIMEOUT: 'defaultConnectionTimeout',
  KEY_SMTP_PROBE_MAX_RETRIES: 'maxRetries',
  KEY_SMTP_PROBE_RETRY_DELAY: 'retryDelay',
  KEY_SMTP_PROBE_RETRY_BACKOFF_MULTIPLIER: 'retryBackoffMultiplier',
  KEY_SMTP_PROBE_SMTP_PORT: 'smtpPort',
  KEY_SMTP_PROBE_SUBMISSION_PORT: 'submissionPort',
  KEY_SMTP_PROBE_SMTPS_PORT: 'smtpsPort',
  KEY_SMTP_PROBE_CACHE_KEY_PREFIX: 'cacheKeyPrefix',

  // SMTP Infrastructure Keywords
  KEY_SMTP_INFRASTRUCTURE: 'smtpInfrastructure',
  };

export const CONNECTIONS = {
  DATABASE_DEFAULT: 'default',
};
