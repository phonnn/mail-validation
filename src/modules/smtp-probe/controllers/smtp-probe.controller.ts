import { Controller, Post, Get, Body, Param, Query, Logger, HttpException, HttpStatus, Req } from '@nestjs/common';
import { SmtpProbeQueueService } from '@mail-validation/modules/smtp-probe/services/smtp-probe-queue.service';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { SmtpProbeGateway } from '@mail-validation/modules/smtp-probe/gateways/smtp-probe.gateway';
import { 
  RateLimitService,
  PerformanceMonitorService,
  SmtpConnectionManagerService,
  SmtpSessionHandlerService,
  IpWarmupService,
  IpRotationService,
  SimpleIpRotationService,
} from '@mail-validation/modules/smtp-infrastructure';
import { TIME_CONSTANTS } from '@mail-validation/common/constants';
import { 
  ProbeEmailRequestDto,
  ProbeEmailResponseDto,
  BatchProbeEmailRequestDto,
  BatchProbeEmailResponseDto,
  JobStatusResponseDto,
  QueueStatsResponseDto,
  JobResultResponseDto
} from '@mail-validation/modules/smtp-probe/dtos';
import { BackoffType, ProbeStatus } from '@mail-validation/modules/smtp-probe';

/**
 * SMTP Probe API Controller
 */
@Controller('smtp-probe')
export class SmtpProbeController {
  private readonly logger = new Logger(SmtpProbeController.name);

  constructor(
    private readonly smtpProbeQueue: SmtpProbeQueueService,
    private readonly smtpProbeService: SmtpProbeService,
    private readonly smtpProbeGateway: SmtpProbeGateway,
    private readonly rateLimitService: RateLimitService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly connectionManager: SmtpConnectionManagerService,
    private readonly sessionHandler: SmtpSessionHandlerService,
    private readonly ipWarmup: IpWarmupService,
    private readonly ipRotation: IpRotationService,
    private readonly simpleIpRotation: SimpleIpRotationService,
  ) {}

  /**
   * Submit email for SMTP probe (async)
   */
  @Post('probe')
  async probeEmail(@Body() request: ProbeEmailRequestDto, @Req() req: any): Promise<ProbeEmailResponseDto> {
    try {
      // Rate limiting
      const clientId = request.clientId || req.ip || 'anonymous';
      const rateLimitResult = await this.rateLimitService.checkUserRateLimit(clientId);
      
      if (!rateLimitResult.allowed) {
        throw new HttpException(
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Validate email format
      if (!this.isValidEmail(request.email)) {
        throw new Error('Invalid email format');
      }

      const domain = request.email.split('@')[1];
      
      // Add job to queue
      const { requestId, jobId } = await this.smtpProbeQueue.addProbeJob(
        request.email,
        domain,
        request.clientId,
        {
          priority: request.priority || 0,
          attempts: 3,
          backoff: {
            type: BackoffType.EXPONENTIAL,
            delay: 2000,
          },
        }
      );

      this.logger.log(`Submitted SMTP probe job for ${request.email} (requestId: ${requestId})`);

      return new ProbeEmailResponseDto({
        requestId,
        jobId,
        status: ProbeStatus.QUEUED,
        message: 'Email probe job submitted successfully',
        estimatedTime: TIME_CONSTANTS.LOAD_TEST_ESTIMATED_TIME_SINGLE,
      });
    } catch (error) {
      this.logger.error(`Failed to submit SMTP probe job for ${request.email}:`, error);
      throw error;
    }
  }

  /**
   * Submit batch of emails for SMTP probe
   */
  @Post('probe/batch')
  async probeBatchEmails(@Body() request: BatchProbeEmailRequestDto, @Req() req: any): Promise<BatchProbeEmailResponseDto> {
    try {
      // Rate limiting for batch requests
      const clientId = request.emails[0]?.clientId || req.ip || 'anonymous';
      const emailCountResult = await this.rateLimitService.checkEmailCountLimit(clientId, request.emails.length);
      
      if (!emailCountResult.allowed) {
        throw new HttpException(
          `Email count limit exceeded. You can process ${emailCountResult.remaining} more emails.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Check per-minute rate limit
      const rateLimitResult = await this.rateLimitService.checkUserRateLimit(clientId);
      if (!rateLimitResult.allowed) {
        throw new HttpException(
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Validate all emails
      const invalidEmails = request.emails.filter(emailData => !this.isValidEmail(emailData.email));
      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email format: ${invalidEmails.map(e => e.email).join(', ')}`);
      }

      const { batchId, jobId, totalEmails } = await this.smtpProbeQueue.addBatchProbeJob(
        request.emails.map(emailData => ({
          email: emailData.email,
          clientId: emailData.clientId,
        })),
        request.batchId,
        {
          priority: request.priority || 0,
          attempts: 3,
          backoff: {
            type: BackoffType.EXPONENTIAL,
            delay: 2000,
          },
        }
      );

      return new BatchProbeEmailResponseDto({
        batchId,
        totalEmails,
        queuedEmails: totalEmails,
        failedEmails: 0,
        status: ProbeStatus.QUEUED,
        message: `Batch probe job submitted successfully with ${totalEmails} emails`,
        estimatedTime: totalEmails * TIME_CONSTANTS.LOAD_TEST_ESTIMATED_TIME_PER_EMAIL,
      });
    } catch (error) {
      this.logger.error('Failed to submit batch email probe:', error);
      throw error;
    }
  }

  /**
   * Get batch job status
   */
  @Get('batch/status/:batchId')
  async getBatchJobStatus(@Param('batchId') batchId: string): Promise<JobStatusResponseDto> {
    try {
      const status = await this.smtpProbeQueue.getBatchJobStatus(batchId);
      
      if (!status) {
        throw new Error(`Batch job not found: ${batchId}`);
      }

      return new JobStatusResponseDto(status);
    } catch (error) {
      this.logger.error(`Failed to get batch job status for ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel batch job
   */
  @Post('batch/cancel/:batchId')
  async cancelBatchJob(@Param('batchId') batchId: string): Promise<JobResultResponseDto> {
    try {
      const success = await this.smtpProbeQueue.cancelBatchJob(batchId);
      
      return new JobResultResponseDto({
        success,
        message: success 
          ? `Batch job ${batchId} cancelled successfully`
          : `Failed to cancel batch job ${batchId}`,
      });
    } catch (error) {
      this.logger.error(`Failed to cancel batch job ${batchId}:`, error);
      return new JobResultResponseDto({
        success: false,
        message: `Error cancelling batch job: ${error.message}`,
      });
    }
  }

  /**
   * Get job status
   */
  @Get('status/:requestId')
  async getJobStatus(@Param('requestId') requestId: string): Promise<JobStatusResponseDto> {
    try {
      const status = await this.smtpProbeQueue.getJobStatus(requestId);
      
      if (!status) {
        throw new Error('Job not found');
      }

      return new JobStatusResponseDto(status);
    } catch (error) {
      this.logger.error(`Failed to get job status for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  @Post('cancel/:requestId')
  async cancelJob(@Param('requestId') requestId: string): Promise<JobResultResponseDto> {
    try {
      const success = await this.smtpProbeQueue.cancelJob(requestId);
      
      if (success) {
        return new JobResultResponseDto({
          requestId,
          success: true,
          message: 'Job cancelled successfully',
        });
      } else {
        return new JobResultResponseDto({
          requestId,
          success: false,
          message: 'Job not found or already completed',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to cancel job ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  @Get('queue/stats')
  async getQueueStats(): Promise<QueueStatsResponseDto> {
    try {
      const stats = await this.smtpProbeQueue.getQueueStats();
      return new QueueStatsResponseDto(stats);
    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      throw error;
    }
  }

  /**
   * Get WebSocket client statistics
   */
  @Get('websocket/stats')
  async getWebSocketStats(): Promise<any> {
    try {
      return this.smtpProbeGateway.getClientStats();
    } catch (error) {
      this.logger.error('Failed to get WebSocket statistics:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<any> {
    try {
      return await this.smtpProbeService.getCacheStats();
    } catch (error) {
      this.logger.error('Failed to get cache statistics:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  @Post('cache/clear')
  async clearCache(@Query('email') email?: string): Promise<JobResultResponseDto> {
    try {
      await this.smtpProbeService.clearCache(email);
      
      const message = email 
        ? `Cache cleared for ${email}`
        : 'All cache cleared';
        
      return new JobResultResponseDto({
        success: true,
        message,
      });
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Pause queue
   */
  @Post('queue/pause')
  async pauseQueue(): Promise<JobResultResponseDto> {
    try {
      await this.smtpProbeQueue.pauseQueue();
      return new JobResultResponseDto({
        success: true,
        message: 'Queue paused successfully',
      });
    } catch (error) {
      this.logger.error('Failed to pause queue:', error);
      throw error;
    }
  }

  /**
   * Resume queue
   */
  @Post('queue/resume')
  async resumeQueue(): Promise<JobResultResponseDto> {
    try {
      await this.smtpProbeQueue.resumeQueue();
      return new JobResultResponseDto({
        success: true,
        message: 'Queue resumed successfully',
      });
    } catch (error) {
      this.logger.error('Failed to resume queue:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  @Get('performance')
  async getPerformanceMetrics() {
    try {
      const summary = this.performanceMonitor.getPerformanceSummary();
      return {
        success: true,
        data: summary,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get rate limit status for a user
   */
  @Get('rate-limit/:userId')
  async getRateLimitStatus(@Param('userId') userId: string) {
    try {
      const status = await this.rateLimitService.getRateLimitStatus(userId);
      return {
        success: true,
        data: status,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get rate limit status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection manager statistics
   */
  @Get('connections/stats')
  async getConnectionStats() {
    try {
      const stats = this.connectionManager.getStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get connection stats:', error);
      throw error;
    }
  }

  /**
   * Get session handler statistics
   */
  @Get('sessions/stats')
  async getSessionStats() {
    try {
      const stats = this.sessionHandler.getSessionStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get session stats:', error);
      throw error;
    }
  }

  /**
   * Get IP warmup status
   */
  @Get('warmup/status')
  async getWarmupStatus() {
    try {
      const stats = this.ipWarmup.getWarmupStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get warmup status:', error);
      throw error;
    }
  }

  /**
   * Get warmup status for specific IP
   */
  @Get('warmup/ip/:ip')
  async getIpWarmupStatus(@Param('ip') ip: string) {
    try {
      const status = this.ipWarmup.getWarmupStatus(ip);
      return {
        success: true,
        data: status,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get warmup status for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * Initialize warmup for IP
   */
  @Post('warmup/ip/:ip/initialize')
  async initializeIpWarmup(@Param('ip') ip: string) {
    try {
      const schedule = await this.ipWarmup.initializeWarmup(ip);
      return {
        success: true,
        data: schedule,
        message: `Warmup initialized for IP ${ip}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to initialize warmup for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * Get IP rotation status
   */
  @Get('ip-rotation/status')
  async getIpRotationStatus() {
    try {
      const stats = this.ipRotation.getRotationStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get IP rotation status:', error);
      throw error;
    }
  }

  /**
   * Get IP rotation configuration
   */
  @Get('ip-rotation/config')
  async getIpRotationConfig() {
    try {
      const config = this.ipRotation.getCurrentConfig();
      return {
        success: true,
        data: config,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get IP rotation config:', error);
      throw error;
    }
  }

  /**
   * Get next IP for rotation
   */
  @Get('ip-rotation/next')
  async getNextIp() {
    try {
      const nextIp = this.ipRotation.getNextIp();
      return {
        success: true,
        data: nextIp,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get next IP:', error);
      throw error;
    }
  }

  /**
   * Force IP rotation
   */
  @Post('ip-rotation/rotate')
  async forceIpRotation() {
    try {
      this.ipRotation.rotateToNextIp();
      const nextIp = this.ipRotation.getNextIp();
      return {
        success: true,
        data: nextIp,
        message: 'IP rotation completed',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to force IP rotation:', error);
      throw error;
    }
  }

  /**
   * Reload IP rotation configuration
   */
  @Post('ip-rotation/reload')
  async reloadIpRotationConfig() {
    try {
      await this.ipRotation.reloadConfiguration();
      return {
        success: true,
        message: 'IP rotation configuration reloaded successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to reload IP rotation config:', error);
      throw error;
    }
  }

  /**
   * Get simple IP rotation status
   */
  @Get('simple-ip-rotation/status')
  async getSimpleIpRotationStatus() {
    try {
      const stats = this.simpleIpRotation.getRotationStats();
      const status = this.simpleIpRotation.getIpRotationStatus();
      return {
        success: true,
        data: {
          ...stats,
          rotationStatus: status,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get simple IP rotation status:', error);
      throw error;
    }
  }

  /**
   * Get next IP from simple rotation
   */
  @Get('simple-ip-rotation/next')
  async getNextSimpleIp() {
    try {
      const nextIp = this.simpleIpRotation.getNextIp();
      const isEnabled = this.simpleIpRotation.isIpRotationEnabled();
      
      return {
        success: true,
        data: { 
          ip: nextIp,
          rotationEnabled: isEnabled,
          mode: isEnabled ? 'rotation' : 'direct-connection'
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get next simple IP:', error);
      throw error;
    }
  }

  /**
   * Get IP status
   */
  @Get('simple-ip-rotation/ip/:ip/status')
  async getIpStatus(@Param('ip') ip: string) {
    try {
      const status = this.simpleIpRotation.getIpStatus(ip);
      return {
        success: true,
        data: status,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get status for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * Record IP success
   */
  @Post('simple-ip-rotation/ip/:ip/success')
  async recordIpSuccess(@Param('ip') ip: string) {
    try {
      this.simpleIpRotation.recordSuccess(ip);
      return {
        success: true,
        message: `Success recorded for IP ${ip}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to record success for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * Record IP error
   */
  @Post('simple-ip-rotation/ip/:ip/error')
  async recordIpError(
    @Param('ip') ip: string,
    @Body() body: { is4xx?: boolean; isConnectionReset?: boolean }
  ) {
    try {
      this.simpleIpRotation.recordError(ip, body.is4xx, body.isConnectionReset);
      return {
        success: true,
        message: `Error recorded for IP ${ip}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to record error for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * Force simple IP rotation
   */
  @Post('simple-ip-rotation/rotate')
  async forceSimpleIpRotation() {
    try {
      this.simpleIpRotation.rotateToNextIp();
      const nextIp = this.simpleIpRotation.getNextIp();
      return {
        success: true,
        data: { ip: nextIp },
        message: 'Simple IP rotation completed',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to force simple IP rotation:', error);
      throw error;
    }
  }

  /**
   * Reload simple IP rotation configuration
   */
  @Post('simple-ip-rotation/reload')
  async reloadSimpleIpRotationConfig() {
    try {
      await this.simpleIpRotation.reloadConfiguration();
      return {
        success: true,
        message: 'Simple IP rotation configuration reloaded successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to reload simple IP rotation config:', error);
      throw error;
    }
  }

  /**
   * Clean up old jobs
   */
  @Post('queue/cleanup')
  async cleanupOldJobs(): Promise<JobResultResponseDto> {
    try {
      await this.smtpProbeQueue.cleanupOldJobs();
      return new JobResultResponseDto({
        success: true,
        message: 'Old jobs cleaned up successfully',
      });
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

