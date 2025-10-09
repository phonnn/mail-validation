import { SmtpProbeResult } from '@mail-validation/modules/smtp-probe/types/smtp-probe-result.type';

/**
 * WebSocket event payload for probe started
 */
export interface ProbeStartedPayload {
  requestId: string;
  email: string;
  estimatedTime: number;
  timestamp: Date;
}

/**
 * WebSocket event payload for probe completed
 */
export interface ProbeCompletedPayload {
  requestId: string;
  email: string;
  result: SmtpProbeResult;
  processingTime: number;
  timestamp: Date;
}

/**
 * WebSocket event payload for probe failed
 */
export interface ProbeFailedPayload {
  requestId: string;
  email: string;
  error: string;
  processingTime: number;
  timestamp: Date;
}

/**
 * WebSocket event payload for probe cached
 */
export interface ProbeCachedPayload {
  requestId: string;
  email: string;
  result: SmtpProbeResult;
  timestamp: Date;
}

/**
 * WebSocket event payload for batch probe started
 */
export interface BatchProbeStartedPayload {
  batchId: string;
  totalEmails: number;
  estimatedTime: number;
  timestamp: Date;
}

/**
 * WebSocket event payload for batch probe failed
 */
export interface BatchProbeFailedPayload {
  batchId: string;
  error: string;
  processingTime: number;
  timestamp: Date;
}

/**
 * WebSocket event payload for error events
 */
export interface ErrorPayload {
  requestId?: string;
  batchId?: string;
  error: string;
  timestamp: Date;
}
