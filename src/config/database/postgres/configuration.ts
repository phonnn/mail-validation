import { registerAs } from '@nestjs/config';
import { CONFIGURATION } from '@mail-validation/config/config.constants';
import { DatabaseConfigurationInterface } from '@mail-validation/config';

/**
 * Database configuration
 */
export default registerAs(
  CONFIGURATION.KEY_DATABASE,
  (): DatabaseConfigurationInterface => ({
    type: process.env.DATABASE_TYPE,
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    autoLoadEntities: true,
    synchronize: false, // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data.
    driver: process.env.DATABASE_DRIVER,
  }),
);
