import { SetMetadata } from '@nestjs/common';
import { CACHE_PROVIDER_NAME } from '@mail-validation/common/cache/constants';

export const CacheProvider = (name: string) =>
  SetMetadata(CACHE_PROVIDER_NAME, name);
