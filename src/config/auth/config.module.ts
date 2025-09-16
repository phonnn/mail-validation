import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';
import configuration from './configuration';
import { AuthConfigService } from './config.service';

/**
 * Import and provide auth configuration related classes.
 *
 * @module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        AUTH_JWT_SECRET: Joi.string().default(CONFIGURATION.DEFAULT_JWT_SECRET),
        AUTH_JWT_EXPIRED: Joi.number().default(
          CONFIGURATION.DEFAULT_JWT_EXPIRED,
        ),
        AUTH_SALT_SIZE: Joi.number().default(CONFIGURATION.DEFAULT_SALT_SIZE),
      }),
    }),
  ],
  providers: [ConfigService, AuthConfigService],
  exports: [ConfigService, AuthConfigService],
})
export class AuthConfigModule {}
