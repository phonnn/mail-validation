import { Module } from '@nestjs/common';
import { AppConfigModule } from '@mail-validation/config';
import { PostgresDatabaseProviderModule } from '@mail-validation/providers/databases';
import { CacheProviderModule } from '@mail-validation/common/cache/cache-provider.module';
import { CacheProviderEnum } from '@mail-validation/common/cache/enums/cache-provider.enum';
import { DnsResolverModule } from '@mail-validation/modules/dns-resolver/dns-resolver.module';
import { SmtpProbeModule } from '@mail-validation/modules/smtp-probe/smtp-probe.module';

@Module({
  imports: [
    // Configs
    AppConfigModule,
    PostgresDatabaseProviderModule,
    CacheProviderModule.forRoot({
      redisUri: process.env.REDIS_URI,
      appName: process.env.APP_NAME,
      provider: CacheProviderEnum.IOREDIS,
    }),

    // Business Modules
    DnsResolverModule,
    SmtpProbeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
