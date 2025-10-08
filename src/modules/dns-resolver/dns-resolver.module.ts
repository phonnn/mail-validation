import { Module } from '@nestjs/common';
import { DomainResolverService } from '@mail-validation/modules/dns-resolver/services/domain-resolver.service';

@Module({
  providers: [DomainResolverService],
  exports: [DomainResolverService],
})
export class DnsResolverModule {}
