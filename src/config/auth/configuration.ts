import { registerAs } from '@nestjs/config';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';

export interface AuthConfigurationInterface {
  jwtSecret: string;
  jwtExpired: number;
  saltSize: number;
}

/**
 * Authorization configuration
 */
export default registerAs(
  CONFIGURATION.KEY_AUTH,
  (): AuthConfigurationInterface => ({
    jwtSecret: process.env.AUTH_JWT_SECRET,
    jwtExpired: +process.env.AUTH_JWT_EXPIRED,
    saltSize: +process.env.AUTH_SALT_SIZE,
  }),
);
