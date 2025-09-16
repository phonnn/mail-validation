export const CONFIGURATION = {
  DEFAULT_APP: 'thu-gioi',
  DEFAULT_URL: 'http://localhost:3000/',
  DEFAULT_PORT: '3000',

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
};

export const CONNECTIONS = {
  DATABASE_DEFAULT: 'default',
};
