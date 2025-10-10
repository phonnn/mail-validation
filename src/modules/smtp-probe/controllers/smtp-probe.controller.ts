import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services';
import {
  BatchSmtpProbeResponseDto,
  ClearCacheResponseDto,
  ProbeBatchDto,
  ProbeEmailDto,
  SmtpProbeResponseDto,
  SmtpProbeStatsResponseDto,
} from '@mail-validation/modules/smtp-probe/dtos';


@Controller('smtp-probe')
export class SmtpProbeController {
  private readonly logger = new Logger(SmtpProbeController.name);

  constructor(private readonly smtpProbeService: SmtpProbeService) {}

  @Post('probe-single')
  async probeSingleEmail(@Body() probeEmailDto: ProbeEmailDto): Promise<SmtpProbeResponseDto> {
    this.logger.log(`Probing single email: ${probeEmailDto.email}`);
    try {
      const result = await this.smtpProbeService.probeEmail(probeEmailDto.email);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('probe-batch')
  async probeBatchEmails(@Body() probeBatchDto: ProbeBatchDto): Promise<BatchSmtpProbeResponseDto> {
    this.logger.log(`Probing batch of ${probeBatchDto.emails.length} emails`);
    try {
      const result = await this.smtpProbeService.probeBatch(probeBatchDto.emails);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getProbeStats(): Promise<SmtpProbeStatsResponseDto> {
    this.logger.log('Getting probe statistics');
    try {
      const stats = await this.smtpProbeService.getProbeStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('clear-cache')
  async clearCache(): Promise<ClearCacheResponseDto> {
    this.logger.log('Clearing probe cache');
    try {
      await this.smtpProbeService.clearCache();
      return {
        success: true,
        message: 'Cache cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
