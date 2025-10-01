import { CacheProviderEnum } from '@mail-validation/common/cache/enums/cache-provider.enum';

export interface ConfigOptions {
  redisUri: string;
  appName: string;
  provider: CacheProviderEnum;
  ttl?: number;
}
