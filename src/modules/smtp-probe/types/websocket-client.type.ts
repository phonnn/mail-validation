/**
 * WebSocket client connection info type
 */
export interface SmtpProbeClientInfo {
  clientId: string;
  socketId: string;
  subscribedRequests: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * WebSocket client statistics type
 */
export interface WebSocketClientStats {
  totalClients: number;
  activeClients: number;
  totalSubscriptions: number;
}
