import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { DnsResolverModule } from '@mail-validation/modules/dns-resolver/dns-resolver.module';
import { SmtpProbeConfigModule } from '@mail-validation/config/smtp-probe';
import { SmtpInfrastructureModule } from '@mail-validation/modules/smtp-infrastructure';
import { SmtpProbeController } from '@mail-validation/modules/smtp-probe/controllers/smtp-probe.controller';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { SmtpProbeQueueService } from '@mail-validation/modules/smtp-probe/services/smtp-probe-queue.service';
import { SmtpProbeProcessor } from '@mail-validation/modules/smtp-probe/processors/smtp-probe.processor';
import { SmtpProbeGateway } from '@mail-validation/modules/smtp-probe/gateways/smtp-probe.gateway';

@Module({
  imports: [
    DnsResolverModule,
    SmtpProbeConfigModule,
    SmtpInfrastructureModule,
    BullModule.registerQueue({
      name: 'smtp-probe',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1,
      },
    }),
  ],
  controllers: [
    SmtpProbeController,
  ],
  providers: [
    SmtpProbeService,
    SmtpProbeQueueService,
    SmtpProbeProcessor,
    SmtpProbeGateway,
  ],
  exports: [
    SmtpProbeService,
    SmtpProbeQueueService,
    SmtpProbeGateway,
  ],
})
export class SmtpProbeModule {}
