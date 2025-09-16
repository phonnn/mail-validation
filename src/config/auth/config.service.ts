import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIGURATION } from '@thu-gioi/config/config.constants';
import { AuthConfigurationInterface } from './configuration';

/**
 * Service dealing with auth config based operations.
 *
 * @class
 */
@Injectable()
export class AuthConfigService implements AuthConfigurationInterface {
  constructor(private readonly _configService: ConfigService) {}

  get jwtSecret(): string {
    return this._configService.get<string>(
      CONFIGURATION.KEY_AUTH + '.' + CONFIGURATION.KEY_AUTH_JWT_SECRET,
    );
  }

  get jwtExpired(): number {
    return Number(
      this._configService.get<number>(
        CONFIGURATION.KEY_AUTH + '.' + CONFIGURATION.KEY_AUTH_JWT_EXPIRED,
      ),
    );
  }

  get saltSize(): number {
    return Number(
      this._configService.get<number>(
        CONFIGURATION.KEY_AUTH + '.' + CONFIGURATION.KEY_AUTH_SALT_SIZE,
      ),
    );
  }
}
