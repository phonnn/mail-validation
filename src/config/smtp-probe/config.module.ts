import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import smtpProbeConfig from './configuration';
import { SmtpProbeConfigService } from './config.service';

@Module({
  imports: [
    ConfigModule.forFeature(smtpProbeConfig),
  ],
  providers: [SmtpProbeConfigService],
  exports: [SmtpProbeConfigService],
})
export class SmtpProbeConfigModule {}
