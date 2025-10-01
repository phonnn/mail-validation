import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigOptions } from '@mail-validation/common/cache/interface/config.interface';
import { ProviderRegistryService } from '@mail-validation/common/cache/services/provider-registry.service';
import { CacheProviderFactory } from '@mail-validation/common/cache/cache-provider.factory';
import { CacheService } from '@mail-validation/common/cache/services/cache.service';
import {
  CACHE_PROVIDER_TOKEN,
  CACHE_SERVICE_TOKEN,
} from '@mail-validation/common/cache/constants';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { CacheProviderInterface } from '@mail-validation/common/cache/interface/cache-provider.interface';

@Module({})
export class CacheProviderModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    const name = 'default';
    return {
      global: true,
      providers: [
        ProviderRegistryService,
        CacheProviderFactory,
        this.createCacheProvider(name, options),
        this.createCacheService(name, options),
        {
          provide: CacheService,
          useExisting: CACHE_SERVICE_TOKEN(name),
        },
        {
          provide: AbstractCacheProvider,
          useExisting: CACHE_PROVIDER_TOKEN(name),
        },
      ],
      exports: [CacheService, AbstractCacheProvider],
      module: CacheProviderModule,
    };
  }

  /*
   * Later we can develop forFeature here to support module-scope provider,
   * or may be multiple provider as the same time?
   * */

  private static createCacheProvider(
    name: string,
    options: ConfigOptions,
  ): Provider {
    const providerToken = CACHE_PROVIDER_TOKEN(name);
    return {
      provide: providerToken,
      useFactory: async (
        factory: CacheProviderFactory,
      ): Promise<CacheProviderInterface> => {
        await factory.registerProvider(options.provider);
        return factory.create(options);
      },
      inject: [CacheProviderFactory],
    };
  }

  private static createCacheService(
    name: string,
    options: ConfigOptions,
  ): Provider {
    const providerToken = CACHE_PROVIDER_TOKEN(name);
    const serviceToken = CACHE_SERVICE_TOKEN(name);
    return {
      provide: serviceToken,
      useFactory: (providerInstance: CacheProviderInterface) =>
        new CacheService(providerInstance, options.ttl),
      inject: [providerToken],
    };
  }
}
