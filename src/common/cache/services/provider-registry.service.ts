import { Reflector } from '@nestjs/core';
import { Injectable, Type } from '@nestjs/common';
import { CacheProviderInterface } from '@mail-validation/common/cache/interface/cache-provider.interface';
import { CACHE_PROVIDER_NAME } from '@mail-validation/common/cache/constants';


@Injectable()
export class ProviderRegistryService {
  private readonly registry = new Map<string, Type<CacheProviderInterface>>();

  constructor(private readonly reflector: Reflector) {}

  register(providers: Type<CacheProviderInterface>[]) {
    for (const provider of providers) {
      const name = this.reflector.get<string>(CACHE_PROVIDER_NAME, provider);
      if (name) {
        this.registry.set(name, provider);
      }
    }
  }

  resolve(name: string): Type<CacheProviderInterface> {
    const provider = this.registry.get(name);
    if (!provider) throw new Error(`Cache provider "${name}" not found.`);
    return provider;
  }
}
