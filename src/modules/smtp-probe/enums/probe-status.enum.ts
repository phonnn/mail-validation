/**
 * Probe status types for SMTP probe operations
 */
export enum ProbeStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}