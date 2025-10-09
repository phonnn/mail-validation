import {
  ProbeStartedPayload,
  ProbeCompletedPayload,
  ProbeFailedPayload,
  ProbeCachedPayload,
  BatchProbeStartedPayload,
  BatchProbeFailedPayload,
  ErrorPayload,
} from '@mail-validation/modules/smtp-probe/types/websocket-event-payloads.type';
import {
  BatchProbeJobResult,
  BatchProcessingProgress,
  SmtpProbeJobProgress,
} from '@mail-validation/modules/smtp-probe';

/**
 * WebSocket event types for SMTP probe
 */
export enum SmtpProbeEventType {
  // Client events (client -> server)
  SUBSCRIBE = 'smtp:subscribe',
  UNSUBSCRIBE = 'smtp:unsubscribe',
  GET_STATUS = 'smtp:get_status',
  
  // Server events (server -> client)
  PROBE_STARTED = 'smtp:probe_started',
  PROBE_PROGRESS = 'smtp:probe_progress',
  PROBE_COMPLETED = 'smtp:probe_completed',
  PROBE_FAILED = 'smtp:probe_failed',
  PROBE_CACHED = 'smtp:probe_cached',
  BATCH_PROBE_STARTED = 'smtp:batch_probe_started',
  BATCH_PROBE_PROGRESS = 'smtp:batch_probe_progress',
  BATCH_PROBE_COMPLETED = 'smtp:batch_probe_completed',
  BATCH_PROBE_FAILED = 'smtp:batch_probe_failed',
  ERROR = 'smtp:error',
}

/**
 * WebSocket event payload mapping
 */
export interface SmtpProbeEventPayload {
  [SmtpProbeEventType.SUBSCRIBE]: {
    requestId: string;
    email: string;
  };
  
  [SmtpProbeEventType.UNSUBSCRIBE]: {
    requestId: string;
  };
  
  [SmtpProbeEventType.GET_STATUS]: {
    requestId: string;
  };
  
  [SmtpProbeEventType.PROBE_STARTED]: ProbeStartedPayload;
  
  [SmtpProbeEventType.PROBE_PROGRESS]: SmtpProbeJobProgress;
  
  [SmtpProbeEventType.PROBE_COMPLETED]: ProbeCompletedPayload;
  
  [SmtpProbeEventType.PROBE_FAILED]: ProbeFailedPayload;
  
  [SmtpProbeEventType.PROBE_CACHED]: ProbeCachedPayload;
  
  [SmtpProbeEventType.BATCH_PROBE_STARTED]: BatchProbeStartedPayload;

  [SmtpProbeEventType.BATCH_PROBE_PROGRESS]: BatchProcessingProgress;

  [SmtpProbeEventType.BATCH_PROBE_COMPLETED]: BatchProbeJobResult;

  [SmtpProbeEventType.BATCH_PROBE_FAILED]: BatchProbeFailedPayload;

  [SmtpProbeEventType.ERROR]: ErrorPayload;
}
