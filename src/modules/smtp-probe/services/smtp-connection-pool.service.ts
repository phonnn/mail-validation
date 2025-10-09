import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as tls from 'tls';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import { SmtpConnectionConfig, SmtpConnectionState } from '@mail-validation/modules/smtp-probe/types';
import { SmtpResponseParserService } from '@mail-validation/modules/smtp-probe/services/smtp-response-parser.service';
import { TIME_CONSTANTS } from '@mail-validation/common/constants';

/**
 * Individual SMTP connection wrapper
 */
export class SmtpConnection {
  private readonly logger = new Logger(SmtpConnection.name);
  private socket: net.Socket | tls.TLSSocket | null = null;
  private state: SmtpConnectionState;
  public isInUse = false;
  private lastUsed = new Date();
  private connectionId: string;

  constructor(
    private readonly config: SmtpConnectionConfig,
    private readonly responseParser: any, // Will be injected
  ) {
    this.connectionId = `${config.host}:${config.port}-${Date.now()}`;
    this.state = {
      connected: false,
      authenticated: false,
      lastActivity: new Date(),
    };
  }

  /**
   * Connect to SMTP server
   */
  async connect(): Promise<void> {
    if (this.socket && this.state.connected) {
      return;
    }

    this.logger.debug(`Connecting to ${this.config.host}:${this.config.port}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.disconnect();
        reject(new Error(`Connection timeout to ${this.config.host}:${this.config.port}`));
      }, this.config.timeout);

      this.socket = this.config.useTls
        ? tls.connect(this.config.port, this.config.host)
        : net.createConnection(this.config.port, this.config.host);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.state = {
          connected: true,
          authenticated: false,
          currentHost: this.config.host,
          currentPort: this.config.port,
          lastActivity: new Date(),
        };
        this.logger.debug(`Connected to ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`Connection error to ${this.config.host}:${this.config.port}:`, error);
        reject(error);
      });

      this.socket.on('timeout', () => {
        clearTimeout(timeout);
        this.disconnect();
        reject(new Error(`Connection timeout to ${this.config.host}:${this.config.port}`));
      });

      this.socket.setTimeout(this.config.timeout);
    });
  }

  /**
   * Disconnect from SMTP server
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.logger.debug(`Disconnecting from ${this.config.host}:${this.config.port}`);
      this.socket.destroy();
      this.socket = null;
      this.state = {
        connected: false,
        authenticated: false,
        lastActivity: new Date(),
      };
      this.isInUse = false;
    }
  }

  /**
   * Send SMTP command and wait for response
   */
  async sendCommand(command: string): Promise<any> {
    if (!this.socket || !this.state.connected) {
      throw new Error('Not connected to SMTP server');
    }

    this.logger.debug(`Sending command: ${command}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, TIME_CONSTANTS.COMMAND_TIMEOUT);

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();

        if (responseData.endsWith('\r\n')) {
          clearTimeout(timeout);
          this.socket?.removeListener('data', onData);

          try {
            const response = this.responseParser.parseResponse(responseData);
            this.state.lastActivity = new Date();
            this.lastUsed = new Date();

            this.logger.debug(`Received response: ${response.code} ${response.message}`);
            resolve({
              success: true,
              response,
            });
          } catch (error) {
            this.logger.error('Failed to parse SMTP response:', error);
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        }
      };

      this.socket.on('data', onData);
      this.socket.write(command + '\r\n');
    });
  }

  /**
   * Mark connection as in use
   */
  markInUse(): void {
    this.isInUse = true;
    this.lastUsed = new Date();
  }

  /**
   * Mark connection as available
   */
  markAvailable(): void {
    this.isInUse = false;
    this.lastUsed = new Date();
  }

  /**
   * Check if connection is healthy
   */
  isHealthy(): boolean {
    if (!this.socket || !this.state.connected) {
      return false;
    }

    // Check if connection is stale (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastUsed > fiveMinutesAgo;
  }

  /**
   * Get connection info
   */
  getInfo() {
    return {
      id: this.connectionId,
      host: this.config.host,
      port: this.config.port,
      isInUse: this.isInUse,
      isHealthy: this.isHealthy(),
      lastUsed: this.lastUsed,
      state: this.state,
    };
  }
}

/**
 * Connection pool for SMTP connections
 */
@Injectable()
export class SmtpConnectionPoolService {
  private readonly logger = new Logger(SmtpConnectionPoolService.name);
  private pools: Map<string, SmtpConnection[]> = new Map();
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly responseParser: SmtpResponseParserService,
    private readonly smtpProbeConfig: SmtpProbeConfigService,
  ) {
    // Clean up stale connections every minute
    setInterval(() => this.cleanupStaleConnections(), 60000);
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(config: SmtpConnectionConfig): Promise<SmtpConnection> {
    const poolKey = `${config.host}:${config.port}`;
    let pool = this.pools.get(poolKey) || [];

    // Find available connection
    let connection = pool.find(conn => !conn.isInUse && conn.isHealthy());

    if (!connection) {
      // Create new connection if pool is not full
      if (pool.length < this.smtpProbeConfig.maxConnectionsPerHost) {
        connection = new SmtpConnection(config, this.responseParser);
        await connection.connect();
        pool.push(connection);
        this.pools.set(poolKey, pool);
        this.logger.debug(`Created new connection for ${poolKey}`);
      } else {
        // Wait for available connection
        connection = await this.waitForAvailableConnection(pool);
      }
    }

    connection.markInUse();
    return connection;
  }

  /**
   * Return connection to pool
   */
  async releaseConnection(connection: SmtpConnection): Promise<void> {
    connection.markAvailable();
    this.logger.debug(`Released connection ${connection.getInfo().id}`);
  }

  /**
   * Wait for an available connection
   */
  private async waitForAvailableConnection(pool: SmtpConnection[]): Promise<SmtpConnection> {
    return new Promise((resolve) => {
      const checkForAvailable = () => {
        const available = pool.find(conn => !conn.isInUse && conn.isHealthy());
        if (available) {
          resolve(available);
        } else {
          setTimeout(checkForAvailable, 100); // Check every 100ms
        }
      };
      checkForAvailable();
    });
  }

  /**
   * Clean up stale connections
   */
  private async cleanupStaleConnections(): Promise<void> {
    for (const [poolKey, pool] of this.pools.entries()) {
      const staleConnections = pool.filter(conn => !conn.isHealthy());
      
      for (const connection of staleConnections) {
        await connection.disconnect();
        const index = pool.indexOf(connection);
        if (index > -1) {
          pool.splice(index, 1);
        }
      }

      if (pool.length === 0) {
        this.pools.delete(poolKey);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [poolKey, pool] of this.pools.entries()) {
      const inUse = pool.filter(conn => conn.isInUse).length;
      const available = pool.filter(conn => !conn.isInUse && conn.isHealthy()).length;
      const stale = pool.filter(conn => !conn.isHealthy()).length;

      stats[poolKey] = {
        total: pool.length,
        inUse,
        available,
        stale,
      };
    }

    return stats;
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    for (const pool of this.pools.values()) {
      for (const connection of pool) {
        await connection.disconnect();
      }
    }
    this.pools.clear();
    this.logger.log('All SMTP connections closed');
  }
}
