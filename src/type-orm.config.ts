import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

import * as userEntities from './modules/user/entities';
import * as storyEntities from './modules/story/entities';
import * as chapterEntities from './modules/chapter/entities';
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
  ],
  migrations: [...Object.values(migrations)],
  ssl:
    `${process.env.DATABASE_SSL}` === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});
