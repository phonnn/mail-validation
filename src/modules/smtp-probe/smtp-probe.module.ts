import { Module } from '@nestjs/common';
import { SmtpProbeConfigModule } from '@mail-validation/config/smtp-probe';
import { CacheProviderModule } from '@mail-validation/common/cache/cache-provider.module';
import { DnsResolverModule } from '@mail-validation/modules/dns-resolver/dns-resolver.module';
import { DomainResolverService } from '@mail-validation/modules/dns-resolver/services/domain-resolver.service';
import { SmtpProbeController } from '@mail-validation/modules/smtp-probe/controllers/smtp-probe.controller';
import { DNS_RESOLVER_TOKEN } from '@mail-validation/modules/smtp-probe/constants/dns-tokens.constants';
import { MxShardingService } from '@mail-validation/modules/smtp-probe/services/mx-sharding.service';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { SmtpSessionService } from '@mail-validation/modules/smtp-probe/services/smtp-session.service';


@Module({
  imports: [
    SmtpProbeConfigModule,
    CacheProviderModule,
    DnsResolverModule,
  ],
  controllers: [SmtpProbeController],
  providers: [
    {
      provide: DNS_RESOLVER_TOKEN,
      useExisting: DomainResolverService,
    },
    SmtpProbeService,
    MxShardingService,
    SmtpSessionService,
  ],
  exports: [
    SmtpProbeService,
    MxShardingService,
    SmtpSessionService,
  ],
})
export class SmtpProbeModule {}
