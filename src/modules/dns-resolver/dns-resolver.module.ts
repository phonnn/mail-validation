import { Module } from '@nestjs/common';
import { DomainResolverService } from '@mail-validation/modules/dns-resolver/services/domain-resolver.service';
import {
  AAAAResolverService,
  AResolverService,
  MxResolverService,
  TxtResolverService,
} from '@mail-validation/modules/dns-resolver/services';

@Module({
  providers: [
    DomainResolverService,
    MxResolverService,
    AResolverService,
    AAAAResolverService,
    TxtResolverService,
  ],
  exports: [DomainResolverService],
})
export class DnsResolverModule {}

