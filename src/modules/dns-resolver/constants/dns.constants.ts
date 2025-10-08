export const DNS_CONSTANTS = {
  DEFAULT_TTL: 43200, // 12 hours in seconds
  CACHE_KEY_PREFIX: 'dns:',
  MAX_RETRIES: 3,
  TIMEOUT: 5000, // 5 seconds
} as const;
