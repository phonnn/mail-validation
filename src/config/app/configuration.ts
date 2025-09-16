import { registerAs } from '@nestjs/config';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';

export interface AppConfigurationInterface {
  port?: number;
  env?: string;
  name?: string;
  url?: string;
}

/**
 * Application configuration
 */
export default registerAs(
  CONFIGURATION.KEY_APP,
  (): AppConfigurationInterface => ({
    env: process.env.APP_ENV,
    name: process.env.APP_NAME,
    url: process.env.APP_URL,
    port: +process.env.APP_PORT,
  }),
);
