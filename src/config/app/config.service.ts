import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigurationInterface } from './configuration';
import { CONFIGURATION } from '@mail-validation/config/config.constants';

/**
 * Service dealing with app config based operations.
 *
 * @class
 */
@Injectable()
export class AppConfigService implements AppConfigurationInterface {
  constructor(private readonly _configService: ConfigService) {}

  get name(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_APP + '.' + CONFIGURATION.KEY_NAME,
    );
  }

  get env(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_APP + '.' + CONFIGURATION.KEY_ENV,
    );
  }

  get url(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_APP + '.' + CONFIGURATION.KEY_URL,
    );
  }

  get port(): number {
    return Number(
      this._configService.get<number>(
        CONFIGURATION.KEY_APP + '.' + CONFIGURATION.KEY_PORT,
      ),
    );
  }
}
