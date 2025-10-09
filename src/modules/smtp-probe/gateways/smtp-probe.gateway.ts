import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SmtpProbeEventType, SmtpProbeEventPayload } from '@mail-validation/modules/smtp-probe/types/websocket-events.type';
import {
  SmtpProbeClientInfo,
  WebSocketClientStats,
} from '@mail-validation/modules/smtp-probe';

/**
 * WebSocket Gateway for SMTP Probe real-time communication
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly for production
  },
  namespace: '/smtp-probe',
})
export class SmtpProbeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SmtpProbeGateway.name);
  private clients: Map<string, SmtpProbeClientInfo> = new Map();

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    const clientId = this.generateClientId();
    const clientInfo: SmtpProbeClientInfo = {
      clientId,
      socketId: client.id,
      subscribedRequests: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(client.id, clientInfo);
    this.logger.log(`Client connected: ${client.id} (${clientId})`);

    // Send a welcome message
    client.emit(SmtpProbeEventType.PROBE_STARTED, {
      requestId: 'welcome',
      email: 'system',
      estimatedTime: 0,
      timestamp: new Date(),
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      this.logger.log(`Client disconnected: ${client.id} (${clientInfo.clientId})`);
      this.clients.delete(client.id);
    }
  }

  /**
   * Subscribe to SMTP probe updates
   */
  @SubscribeMessage(SmtpProbeEventType.SUBSCRIBE)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SmtpProbeEventPayload[SmtpProbeEventType.SUBSCRIBE],
  ): void {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      client.emit(SmtpProbeEventType.ERROR, {
        error: 'Client not found',
        timestamp: new Date(),
      });
      return;
    }

    clientInfo.subscribedRequests.add(data.requestId);
    clientInfo.lastActivity = new Date();

    this.logger.debug(`Client ${clientInfo.clientId} subscribed to request ${data.requestId}`);
    
    // Join room for this request
    client.join(`request:${data.requestId}`);
  }

  /**
   * Unsubscribe from SMTP probe updates
   */
  @SubscribeMessage(SmtpProbeEventType.UNSUBSCRIBE)
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SmtpProbeEventPayload[SmtpProbeEventType.UNSUBSCRIBE],
  ): void {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return;
    }

    clientInfo.subscribedRequests.delete(data.requestId);
    clientInfo.lastActivity = new Date();

    this.logger.debug(`Client ${clientInfo.clientId} unsubscribed from request ${data.requestId}`);
    
    // Leave room for this request
    client.leave(`request:${data.requestId}`);
  }

  /**
   * Get status of a specific request
   */
  @SubscribeMessage(SmtpProbeEventType.GET_STATUS)
  handleGetStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SmtpProbeEventPayload[SmtpProbeEventType.GET_STATUS],
  ): void {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      client.emit(SmtpProbeEventType.ERROR, {
        requestId: data.requestId,
        error: 'Client not found',
        timestamp: new Date(),
      });
      return;
    }

    clientInfo.lastActivity = new Date();

    // TODO: Implement status checking logic
    // This would typically query the job queue or cache for current status
    client.emit(SmtpProbeEventType.PROBE_PROGRESS, {
      requestId: data.requestId,
      email: 'unknown',
      status: 'queued',
      progress: 0,
      message: 'Request status unknown',
      timestamp: new Date(),
    });
  }

  /**
   * Emit event to a specific client
   */
  emitToClient(clientId: string, event: SmtpProbeEventType, data: any): void {
    const client = this.findClientByClientId(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  /**
   * Emit event to all clients subscribed to a request
   */
  emitToRequest(requestId: string, event: SmtpProbeEventType, data: any): void {
    this.server.to(`request:${requestId}`).emit(event, data);
  }

  /**
   * Emit event to all connected clients
   */
  emitToAll(event: SmtpProbeEventType, data: any): void {
    this.server.emit(event, data);
  }

  /**
   * Get connected clients statistics
   */
  getClientStats(): WebSocketClientStats {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    let totalSubscriptions = 0;
    let activeClients = 0;

    for (const clientInfo of this.clients.values()) {
      totalSubscriptions += clientInfo.subscribedRequests.size;
      if (clientInfo.lastActivity > fiveMinutesAgo) {
        activeClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      activeClients,
      totalSubscriptions,
    };
  }

  /**
   * Clean up inactive clients
   */
  cleanupInactiveClients(): void {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.lastActivity < thirtyMinutesAgo) {
        this.logger.debug(`Cleaning up inactive client: ${socketId}`);
        this.clients.delete(socketId);
      }
    }
  }

  /**
   * Find client by client ID
   */
  private findClientByClientId(clientId: string): Socket | null {
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.clientId === clientId) {
        return this.server.sockets.sockets.get(socketId) || null;
      }
    }
    return null;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

