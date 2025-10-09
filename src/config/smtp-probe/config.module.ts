import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import smtpProbeConfiguration from './configuration';
import { SmtpProbeConfigService } from './config.service';

/**
 * SMTP Probe configuration module
 */
@Module({
  imports: [
    ConfigModule.forFeature(smtpProbeConfiguration),
  ],
  providers: [SmtpProbeConfigService],
  exports: [SmtpProbeConfigService],
})
export class SmtpProbeConfigModule {}

