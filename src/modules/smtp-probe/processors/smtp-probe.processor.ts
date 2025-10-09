import { Process, Processor, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { SmtpProbeJobData, SmtpProbeJobResult, SmtpProbeJobProgress } from '@mail-validation/modules/smtp-probe/types/smtp-probe-job.type';
import { BatchProbeJobData, BatchProbeJobResult } from '@mail-validation/modules/smtp-probe/types/batch-probe-job.type';
import { SmtpProbeEventType } from '@mail-validation/modules/smtp-probe/types/websocket-events.type';
import { BatchEmailResult, BatchProcessingProgress } from '@mail-validation/modules/smtp-probe/types/batch-processing-result.type';
import { EmailResultStatus } from '@mail-validation/modules/smtp-probe/enums/email-result-status.enum';
import { ProbeStatus } from '@mail-validation/modules/smtp-probe/enums/probe-status.enum';
import {
  ProbeStartedPayload,
  ProbeCompletedPayload,
  ProbeFailedPayload,
  BatchProbeStartedPayload,
} from '@mail-validation/modules/smtp-probe/types/websocket-event-payloads.type';
import { SmtpProbeGateway } from '@mail-validation/modules/smtp-probe/gateways/smtp-probe.gateway';
import { TIME_CONSTANTS } from '@mail-validation/common/constants';

/**
 * SMTP Probe Queue Processor
 * Handles background processing of SMTP probe jobs
 */
@Processor('smtp-probe')
export class SmtpProbeProcessor {
  private readonly logger = new Logger(SmtpProbeProcessor.name);
  private readonly workerId = `worker-${process.pid}-${Date.now()}`;

  constructor(
    private readonly smtpProbeService: SmtpProbeService,
    private readonly smtpProbeGateway: SmtpProbeGateway,
  ) {}

  /**
   * Process SMTP probe job
   */
  @Process('probe-email')
  async handleSmtpProbe(job: Job<SmtpProbeJobData>): Promise<SmtpProbeJobResult> {
    const { email, domain, requestId, clientId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing SMTP probe job ${job.id} for ${email}`);

    try {
      // Update job progress
      await this.updateJobProgress(job, {
        requestId,
        email,
        status: ProbeStatus.PROCESSING,
        progress: 10,
        message: 'Starting SMTP probe...',
        timestamp: new Date(),
      });

      // Emit WebSocket event
      const probeStartedPayload: ProbeStartedPayload = {
        requestId,
        email,
        estimatedTime: 10000, // 10 seconds
        timestamp: new Date(),
      };
      this.smtpProbeGateway.emitToClient(clientId, SmtpProbeEventType.PROBE_STARTED, probeStartedPayload);

      // Check cache first
      await this.updateJobProgress(job, {
        requestId,
        email,
        status: ProbeStatus.PROCESSING,
        progress: 20,
        message: 'Checking cache...',
        timestamp: new Date(),
      });

      const cached = await this.smtpProbeService.getCachedResult(email);
      if (cached) {
        this.logger.debug(`Cache hit for ${email}`);
        
        const result: SmtpProbeJobResult = {
          requestId,
          email,
          result: { ...cached, cached: true },
          processingTime: Date.now() - startTime,
          workerId: this.workerId,
          timestamp: new Date(),
        };

        // Emit cached result
        const probeCachedPayload = {
          requestId,
          email,
          result: result.result,
          timestamp: new Date(),
        };
        this.smtpProbeGateway.emitToClient(clientId, SmtpProbeEventType.PROBE_CACHED, probeCachedPayload);

        return result;
      }

      // Perform DNS resolution
      await this.updateJobProgress(job, {
        requestId,
        email,
        status: ProbeStatus.PROCESSING,
        progress: 30,
        message: 'Resolving DNS records...',
        timestamp: new Date(),
      });

      // Perform SMTP probe
      await this.updateJobProgress(job, {
        requestId,
        email,
        status: ProbeStatus.PROCESSING,
        progress: 50,
        message: 'Probing SMTP servers...',
        timestamp: new Date(),
      });

      const result = await this.smtpProbeService.probeEmail(email);

      await this.updateJobProgress(job, {
        requestId,
        email,
        status: ProbeStatus.PROCESSING,
        progress: 90,
        message: 'Finalizing results...',
        timestamp: new Date(),
      });

      const jobResult: SmtpProbeJobResult = {
        requestId,
        email,
        result,
        processingTime: Date.now() - startTime,
        workerId: this.workerId,
        timestamp: new Date(),
      };

      // Emit completion event
      const probeCompletedPayload: ProbeCompletedPayload = {
        requestId,
        email,
        result,
        processingTime: jobResult.processingTime,
        timestamp: new Date(),
      };
      this.smtpProbeGateway.emitToClient(clientId, SmtpProbeEventType.PROBE_COMPLETED, probeCompletedPayload);

      this.logger.log(`Completed SMTP probe job ${job.id} for ${email} in ${jobResult.processingTime}ms`);
      return jobResult;

    } catch (error) {
      this.logger.error(`SMTP probe job ${job.id} failed for ${email}:`, error);

      const jobResult: SmtpProbeJobResult = {
        requestId,
        email,
        result: {
          domain,
          email,
          verdict: 'unknown' as any,
          score: 0,
          mxResults: [],
          totalResponseTime: Date.now() - startTime,
          timestamp: new Date(),
          cached: false,
          error: error.message,
        },
        processingTime: Date.now() - startTime,
        workerId: this.workerId,
        timestamp: new Date(),
      };

      // Emit failure event
      const probeFailedPayload: ProbeFailedPayload = {
        requestId,
        email,
        error: error.message,
        processingTime: jobResult.processingTime,
        timestamp: new Date(),
      };
      this.smtpProbeGateway.emitToClient(clientId, SmtpProbeEventType.PROBE_FAILED, probeFailedPayload);

      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(job: Job, progress: SmtpProbeJobProgress): Promise<void> {
    try {
      await job.progress(progress.progress);
      
      // Emit progress event via WebSocket
      this.smtpProbeGateway.emitToClient(job.data.clientId, SmtpProbeEventType.PROBE_PROGRESS, progress);
    } catch (error) {
      this.logger.warn(`Failed to update job progress:`, error);
    }
  }

  /**
   * Handle job completion
   */
  @OnQueueCompleted()
  async onCompleted(job: Job<SmtpProbeJobData>, result: SmtpProbeJobResult): Promise<void> {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  /**
   * Handle job failure
   */
  @OnQueueFailed()
  async onFailed(job: Job<SmtpProbeJobData>, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed:`, error);
    
    // Emit error event via WebSocket
    this.smtpProbeGateway.emitToClient(job.data.clientId, SmtpProbeEventType.ERROR, {
      requestId: job.data.requestId,
      error: error.message,
      timestamp: new Date(),
    });
  }

  /**
   * Handle batch SMTP probe job
   */
  @Process('batch-probe-email')
  async handleBatchSmtpProbe(job: Job<BatchProbeJobData>): Promise<BatchProbeJobResult> {
    const { batchId, emails, totalEmails } = job.data;
    const startTime = Date.now();
    
    this.logger.log(`Starting batch probe for ${batchId} with ${totalEmails} emails`);

    // Emit batch started event
    const batchStartedPayload: BatchProbeStartedPayload = {
      batchId,
      totalEmails,
      estimatedTime: totalEmails * TIME_CONSTANTS.LOAD_TEST_ESTIMATED_TIME_PER_EMAIL,
      timestamp: new Date(),
    };
    this.smtpProbeGateway.emitToAll(SmtpProbeEventType.BATCH_PROBE_STARTED, batchStartedPayload);

    const results: BatchEmailResult[] = [];
    let completedEmails = 0;
    let failedEmails = 0;

    // Process emails in parallel with concurrency limit
    const concurrencyLimit = 5; // Process max 5 emails at once
    const chunks = this.chunkArray(emails, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (emailData) => {
        try {
          // Update progress
          const progress: BatchProcessingProgress = {
            batchId,
            totalEmails,
            processedEmails: completedEmails + failedEmails,
            completedEmails,
            failedEmails,
            progress: Math.round(((completedEmails + failedEmails) / totalEmails) * 100),
            currentEmail: emailData.email,
            message: `Processing ${emailData.email}...`,
            timestamp: new Date(),
          };

          await this.updateBatchJobProgress(job, progress);

          // Process individual email
          const result = await this.smtpProbeService.probeEmail(emailData.email);
          
          completedEmails++;
          
          const batchEmailResult: BatchEmailResult = {
            email: emailData.email,
            requestId: emailData.requestId,
            result,
            status: EmailResultStatus.COMPLETED,
          };
          results.push(batchEmailResult);

          return result;
        } catch (error) {
          failedEmails++;
          
          const failedBatchEmailResult: BatchEmailResult = {
            email: emailData.email,
            requestId: emailData.requestId,
            result: null,
            status: EmailResultStatus.FAILED,
            error: error.message,
          };
          results.push(failedBatchEmailResult);

          this.logger.error(`Failed to probe email ${emailData.email}:`, error);
          return null;
        }
      });

      // Wait for current chunk to complete
      await Promise.allSettled(chunkPromises);

      // Emit progress update
      const progress: BatchProcessingProgress = {
        batchId,
        totalEmails,
        processedEmails: completedEmails + failedEmails,
        completedEmails,
        failedEmails,
        progress: Math.round(((completedEmails + failedEmails) / totalEmails) * 100),
        message: `Processed ${completedEmails + failedEmails}/${totalEmails} emails`,
        timestamp: new Date(),
      };

      await this.updateBatchJobProgress(job, progress);
    }

    const processingTime = Date.now() - startTime;
    const batchResult: BatchProbeJobResult = {
      batchId,
      totalEmails,
      completedEmails,
      failedEmails,
      results,
      processingTime,
      timestamp: new Date(),
    };

    // Emit batch completed event
    this.smtpProbeGateway.emitToAll(SmtpProbeEventType.BATCH_PROBE_COMPLETED, batchResult);

    this.logger.log(`Batch probe completed for ${batchId}: ${completedEmails} succeeded, ${failedEmails} failed`);
    
    return batchResult;
  }

  /**
   * Update batch job progress
   */
  private async updateBatchJobProgress(job: Job<BatchProbeJobData>, progress: BatchProcessingProgress): Promise<void> {
    try {
      await job.progress(progress.progress);
      
      // Emit progress event via WebSocket
      this.smtpProbeGateway.emitToAll(SmtpProbeEventType.BATCH_PROBE_PROGRESS, progress);
    } catch (error) {
      this.logger.warn(`Failed to update batch job progress:`, error);
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Handle job stalled
   */
  @OnQueueStalled()
  async onStalled(job: Job<SmtpProbeJobData>): Promise<void> {
    this.logger.warn(`Job ${job.id} stalled`);
  }
}

