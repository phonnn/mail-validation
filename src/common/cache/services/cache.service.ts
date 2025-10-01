import { Injectable } from '@nestjs/common';
import { CacheProviderInterface } from '@mail-validation/common/cache/interface/cache-provider.interface';
import {
  CacheManagementResponseInterface
} from '@mail-validation/common/cache/interface/cache-management-response.interface';


@Injectable()
export class CacheService {
  constructor(
    private readonly client: CacheProviderInterface,
    private readonly defaultTtl?: number,
  ) {}

  async flush(): Promise<void> {
    await this.client.clear();
  }

  async getByPatterns(patterns: string[]): Promise<Record<string, any>[]> {
    const entriesToReturn: Record<string, any>[] = [];
    const combinedRegex = new RegExp(`${patterns.join('|')}`);

    for await (const [key, value] of this.client.iterator()) {
      if (combinedRegex.test(key)) {
        entriesToReturn.push({ key, value });
      }
    }

    return entriesToReturn;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.client.set(key, value, ttl ?? this.defaultTtl);
  }

  deleteMany(keys: string[]): Promise<boolean> {
    return this.client.delete(keys);
  }

  async clearIntrospection(): Promise<CacheManagementResponseInterface[]> {
    const schemaKey = ['fqc:_service:'];
    const cache = await this.getByPatterns(schemaKey);

    const keys = cache.map(({ key }) => key);
    if (keys.length === 0) {
      return [];
    }

    await this.deleteMany(keys);
    return cache as CacheManagementResponseInterface[];
  }

  async clearByBlockName(
    apisName: string[],
  ): Promise<CacheManagementResponseInterface[]> {
    const schemaKeys = apisName.map((apiName: string) => `fqc:${apiName}:`);
    const cache = await this.getByPatterns(schemaKeys);

    const keys = cache.map(({ key }) => key);
    if (keys.length === 0) {
      return [];
    }

    await this.deleteMany(keys);
    return cache as CacheManagementResponseInterface[];
  }
}
