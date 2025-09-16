import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';

import configuration from './configuration';
import { PostgresConfigService } from './config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        DATABASE_TYPE: Joi.string().default(
          CONFIGURATION.DATABASE_TYPE_POSTGRES,
        ),
        DATABASE_NAME: Joi.string(),
        DATABASE_HOST: Joi.string(),
        DATABASE_PORT: Joi.number(),
        DATABASE_USERNAME: Joi.string(),
        DATABASE_PASSWORD: Joi.string(),
        DATABASE_SYNCHRONIZE: Joi.boolean().valid(true, false).default(false),
        DATABASE_DRIVER: Joi.string(),
      }),
    }),
  ],
  providers: [ConfigService, PostgresConfigService],
  exports: [ConfigService, PostgresConfigService],
})
export class PostgresConfigModule {}
