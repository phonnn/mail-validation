export interface SmtpProbeStats {
  totalProbes: number;
  successfulProbes: number;
  failedProbes: number;
  averageResponseTime: number;
  activeConnections: number;
}

export interface BatchStats {
  valid: number;
  invalid: number;
  catchAll: number;
  errors: number;
  averageResponseTime: number;
}
