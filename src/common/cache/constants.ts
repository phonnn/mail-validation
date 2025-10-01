export const CACHE_PROVIDER_NAME = 'CACHE_PROVIDER_NAME';

export const CACHE_PROVIDER_TOKEN = (name: string) =>
  `CACHE_PROVIDER_${name.toUpperCase()}`;

export const CACHE_SERVICE_TOKEN = (name: string) =>
  `CACHE_SERVICE_${name.toUpperCase()}`;
