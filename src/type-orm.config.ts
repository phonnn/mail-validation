import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

import { EmailValidationEntity } from './modules/email-validation/entities/email-validation.entity';
import * as migrations from './migrations';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  logging: true,
  entities: [
    // ...Object.values(userEntities),
    // ...Object.values(storyEntities),
    // ...Object.values(chapterEntities),
    EmailValidationEntity,
  ],
  migrations: [...Object.values(migrations)],
  ssl:
    `${process.env.DATABASE_SSL}` === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});
