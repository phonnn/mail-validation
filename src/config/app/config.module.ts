import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import configuration from './configuration';
import { AppConfigService } from './config.service';
import { CONFIGURATION } from '@mail-validation/config/config.constants';

/**
 * Import and provide app configuration related classes.
 *
 * @module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        APP_NAME: Joi.string().default(CONFIGURATION.DEFAULT_APP),
        APP_ENV: Joi.string()
          .valid('dev', 'prod', 'test', 'qa', 'local')
          .default('dev'),
        APP_URL: Joi.string().default(CONFIGURATION.DEFAULT_URL),
        APP_PORT: Joi.number().default(CONFIGURATION.DEFAULT_PORT),
      }),
    }),
  ],
  providers: [ConfigService, AppConfigService],
  exports: [ConfigService, AppConfigService],
})
export class AppConfigModule {}
