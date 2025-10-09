import { QueueStats } from '@mail-validation/modules/smtp-probe/types/queue-stats.type';

/**
 * Response DTO for queue statistics
 */
export class QueueStatsResponseDto implements QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;

  constructor(data: QueueStats) {
    this.waiting = data.waiting;
    this.active = data.active;
    this.completed = data.completed;
    this.failed = data.failed;
    this.delayed = data.delayed;
    this.paused = data.paused;
    this.total = data.total;
  }
}
