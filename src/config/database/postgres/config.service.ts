import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';
import { DatabaseConfigurationInterface } from '@thu-gioi/config';

/**
 * Service dealing with postgres database config based operations.
 */
@Injectable()
export class PostgresConfigService implements DatabaseConfigurationInterface {
  constructor(private readonly _configService: ConfigService) {}

  get type(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_TYPE,
    );
  }

  get autoLoadEntities(): boolean {
    return !!this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE +
        '.' +
        CONFIGURATION.KEY_DATABASE_AUTOLOAD_ENTITIES,
    );
  }

  get database(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_NAME,
    );
  }

  get host(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_HOST,
    );
  }

  get port(): number {
    return Number(
      this._configService.get<number>(
        CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_PORT,
      ),
    );
  }

  get username(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_USERNAME,
    );
  }

  get password(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_PASSWORD,
    );
  }

  get synchronize(): boolean {
    return !!this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_SYNCHRONIZE,
    );
  }

  get driver(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_DATABASE + '.' + CONFIGURATION.KEY_DATABASE_DRIVER,
    );
  }
}
