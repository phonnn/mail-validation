import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_PROVIDER_NAME } from '@mail-validation/common/cache/constants';
import { ConfigOptions } from '@mail-validation/common/cache/interface/config.interface';
import { CacheProviderInterface } from '@mail-validation/common/cache/interface/cache-provider.interface';
import { ProviderRegistryService } from '@mail-validation/common/cache/services/provider-registry.service';
import * as providers from '@mail-validation/common/cache/providers';


@Injectable()
export class CacheProviderFactory {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly reflector: Reflector,
  ) {}

  async registerProvider(name: string): Promise<void> {
    const matched = Object.values(providers).filter(
      (provider: any) =>
        this.reflector.get<string>(CACHE_PROVIDER_NAME, provider) === name,
    );

    if (matched.length === 0) {
      throw new Error(`No provider found for cache engine: ${name}`);
    }

    this.registry.register(matched);
  }

  create(options: ConfigOptions): CacheProviderInterface {
    const ProviderClass = this.registry.resolve(options.provider);
    return new ProviderClass(options.redisUri, options.appName);
  }
}
