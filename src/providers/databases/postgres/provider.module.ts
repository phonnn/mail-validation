import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { PostgresConfigModule, PostgresConfigService } from '@thu-gioi/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [PostgresConfigModule],
      useFactory: async (
        dbConfigService: PostgresConfigService,
      ): Promise<TypeOrmModuleOptions> => ({
        type: 'postgres',
        host: dbConfigService.host,
        port: dbConfigService.port,
        username: dbConfigService.username,
        password: dbConfigService.password,
        database: dbConfigService.database,
        autoLoadEntities: dbConfigService.autoLoadEntities,
        synchronize: dbConfigService.synchronize,
        logging: false,
        ssl:
          `${process.env.DATABASE_SSL}` === 'true'
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }),
      inject: [PostgresConfigService],
    } as TypeOrmModuleAsyncOptions),
  ],
})
export class PostgresDatabaseProviderModule {}
