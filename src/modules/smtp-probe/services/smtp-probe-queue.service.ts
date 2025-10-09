import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import {
  BackoffType,
  BatchJobSubmissionResult,
  BatchProbeJobData,
  DefaultQueueJobOptions,
  EmailData,
  EmailDataWithRequestId,
  JobStatus,
  JobStatusInfo,
  QueueJobOptions,
  QueueStats,
  SmtpProbeJobData,
  SmtpProbeJobOptions,
} from '@mail-validation/modules/smtp-probe';


/**
 * SMTP Probe Queue Service
 * Manages job queuing and processing
 */
@Injectable()
export class SmtpProbeQueueService {
  private readonly logger = new Logger(SmtpProbeQueueService.name);

  constructor(
    @InjectQueue('smtp-probe') private readonly smtpProbeQueue: Queue,
  ) {}

  /**
   * Add SMTP probe job to queue
   */
  async addProbeJob(
    email: string,
    domain: string,
    clientId?: string,
    options: SmtpProbeJobOptions = {},
  ): Promise<{ requestId: string; jobId: string }> {
    const { v4: uuidv4 } = await import('uuid');
    const requestId = uuidv4();
    
    const jobData: SmtpProbeJobData = {
      email,
      domain,
      requestId,
      clientId,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.attempts || 3,
    };

    const jobOptions = {
      jobId: requestId, // Use requestId as jobId for uniqueness
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: options.backoff || {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: options.removeOnComplete || 100,
      removeOnFail: options.removeOnFail || 50,
      priority: options.priority || 0,
    };

    try {
      const job = await this.smtpProbeQueue.add('probe-email', jobData, jobOptions);
      
      this.logger.log(`Added SMTP probe job ${job.id} for ${email} (requestId: ${requestId})`);
      
      return {
        requestId,
        jobId: job.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to add SMTP probe job for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(requestId: string): Promise<JobStatusInfo | null> {
    try {
      const job = await this.smtpProbeQueue.getJob(requestId);
      
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress() as number || 0;

      return {
        requestId,
        status: state as any,
        progress,
        data: job.data,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${requestId}:`, error);
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(requestId: string): Promise<boolean> {
    try {
      const job = await this.smtpProbeQueue.getJob(requestId);
      
      if (!job) {
        return false;
      }

      await job.remove();
      this.logger.log(`Cancelled job ${requestId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Add batch SMTP probe job to queue
   */
  async addBatchProbeJob(
    emails: EmailData[],
    batchId?: string,
    options: QueueJobOptions = {},
  ): Promise<BatchJobSubmissionResult> {
    const { v4: uuidv4 } = await import('uuid');
    const finalBatchId = batchId || uuidv4();
    
    // Generate individual request IDs for each email
    const emailsWithRequestIds: EmailDataWithRequestId[] = emails.map(emailData => ({
      ...emailData,
      requestId: uuidv4(),
    }));

    const jobData: BatchProbeJobData = {
      batchId: finalBatchId,
      emails: emailsWithRequestIds,
      totalEmails: emails.length,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.attempts || 3,
    };

    const defaultOptions: DefaultQueueJobOptions = {
      delay: 0,
      attempts: 3,
      backoff: {
        type: BackoffType.EXPONENTIAL,
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
      priority: 0,
    };

    const jobOptions: QueueJobOptions = {
      delay: options.delay ?? defaultOptions.delay,
      attempts: options.attempts ?? defaultOptions.attempts,
      backoff: options.backoff ?? defaultOptions.backoff,
      removeOnComplete: options.removeOnComplete ?? defaultOptions.removeOnComplete,
      removeOnFail: options.removeOnFail ?? defaultOptions.removeOnFail,
      priority: options.priority ?? defaultOptions.priority,
    };

    const job = await this.smtpProbeQueue.add('batch-probe-email', jobData, jobOptions);
    
    this.logger.log(`Batch probe job queued: ${finalBatchId} with ${emails.length} emails`);
    
    return {
      batchId: finalBatchId,
      jobId: job.id as string,
      totalEmails: emails.length,
    };
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(batchId: string): Promise<JobStatusInfo | null> {
    try {
      const jobs = await this.smtpProbeQueue.getJobs([JobStatus.WAITING, JobStatus.ACTIVE, JobStatus.COMPLETED, JobStatus.FAILED]);
      const batchJob = jobs.find(job => 
        job.data && job.data.batchId === batchId
      );

      if (!batchJob) {
        return null;
      }

      return {
        requestId: batchJob.data?.batchId || batchJob.id as string,
        status: (await batchJob.getState()) as JobStatus,
        progress: batchJob.progress(),
        data: batchJob.data,
        error: batchJob.failedReason,
        createdAt: batchJob.timestamp ? new Date(batchJob.timestamp) : undefined,
        processedAt: batchJob.processedOn ? new Date(batchJob.processedOn) : undefined,
        finishedAt: batchJob.finishedOn ? new Date(batchJob.finishedOn) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get batch job status for ${batchId}:`, error);
      return null;
    }
  }

  /**
   * Cancel batch job
   */
  async cancelBatchJob(batchId: string): Promise<boolean> {
    try {
      const jobs = await this.smtpProbeQueue.getJobs([JobStatus.WAITING, JobStatus.ACTIVE]);
      const batchJob = jobs.find(job => 
        job.data && job.data.batchId === batchId
      );

      if (!batchJob) {
        this.logger.warn(`Batch job not found: ${batchId}`);
        return false;
      }

      await batchJob.remove();
      this.logger.log(`Batch job cancelled: ${batchId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel batch job ${batchId}:`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.smtpProbeQueue.getWaiting(),
        this.smtpProbeQueue.getActive(),
        this.smtpProbeQueue.getCompleted(),
        this.smtpProbeQueue.getFailed(),
        this.smtpProbeQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: 0, // Bull doesn't have getPaused method
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        total: 0,
      };
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      // Clean up completed jobs older than 1 hour
      await this.smtpProbeQueue.clean(60 * 60 * 1000, 'completed');
      
      // Clean up failed jobs older than 24 hours
      await this.smtpProbeQueue.clean(24 * 60 * 60 * 1000, 'failed');
      
      this.logger.debug('Cleaned up old jobs');
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs:', error);
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.smtpProbeQueue.pause();
      this.logger.log('SMTP probe queue paused');
    } catch (error) {
      this.logger.error('Failed to pause queue:', error);
    }
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.smtpProbeQueue.resume();
      this.logger.log('SMTP probe queue resumed');
    } catch (error) {
      this.logger.error('Failed to resume queue:', error);
    }
  }

  /**
   * Get job by request ID
   */
  async getJob(requestId: string): Promise<Job<SmtpProbeJobData> | null> {
    try {
      return await this.smtpProbeQueue.getJob(requestId);
    } catch (error) {
      this.logger.error(`Failed to get job ${requestId}:`, error);
      return null;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(requestId: string): Promise<boolean> {
    try {
      const job = await this.smtpProbeQueue.getJob(requestId);
      
      if (!job) {
        return false;
      }

      await job.retry();
      this.logger.log(`Retried job ${requestId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job ${requestId}:`, error);
      return false;
    }
  }
}
