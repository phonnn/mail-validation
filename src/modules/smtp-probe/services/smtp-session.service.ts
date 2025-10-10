import { Injectable, Logger } from '@nestjs/common';
import { SmtpSessionInterface } from '@mail-validation/modules/smtp-probe/interfaces/smtp-probe.interface';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import { SmtpResponse, RcptResult, SmtpSessionStats } from '@mail-validation/modules/smtp-probe/types/smtp-session.type';
import { SMTP_CONSTANTS } from '@mail-validation/modules/smtp-probe/constants/smtp.constants';
import * as net from 'net';
import * as tls from 'tls';

@Injectable()
export class SmtpSessionService implements SmtpSessionInterface {
  private readonly logger = new Logger(SmtpSessionService.name);
  private socket: net.Socket | tls.TLSSocket | null = null;
  private isConnected = false;
  private sessionStats: SmtpSessionStats = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageResponseTime: 0,
  };
  private responseTimes: number[] = [];

  constructor(
    private readonly configService: SmtpProbeConfigService,
  ) {}

  /**
   * Create and manage SMTP session with a specific MX host
   */
  async createSession(mxHost: string): Promise<void> {
    this.logger.debug(`Creating SMTP session with ${mxHost}`);

    try {
      // Create a TCP connection
      this.socket = new net.Socket();
      this.socket.setTimeout(this.configService.connectionTimeout);

      // Connect to SMTP server
      await this.connectToHost(mxHost);
      
      // Read initial greeting
      await this.readResponse();
      
      // Send HELO command with domain only
      const heloDomain = SMTP_CONSTANTS.DEFAULT_SENDER.split('@')[1];
      await this.sendCommand(`HELO ${heloDomain}`);
      
      // Try to enable PIPELINING if configured
      if (this.configService.enablePipelining) {
        try {
          await this.sendCommand(SMTP_CONSTANTS.SMTP_COMMANDS.PIPELINING);
          this.logger.debug('PIPELINING enabled successfully');
        } catch (error) {
          this.logger.warn('PIPELINING not supported by this server');
        }
      }

      // Try to enable STARTTLS if configured
      if (this.configService.tlsEnabled) {
        try {
          await this.sendCommand(SMTP_CONSTANTS.SMTP_COMMANDS.STARTTLS);
          await this.upgradeToTls();
          this.logger.debug('TLS enabled successfully');
        } catch (error) {
          this.logger.warn('TLS not supported or failed:', error);
        }
      }

      this.isConnected = true;
      this.logger.debug(`SMTP session established with ${mxHost}`);
    } catch (error) {
      this.logger.error(`Failed to create SMTP session with ${mxHost}:`, error);
      await this.closeSession();
      throw error;
    }
  }

  /**
   * Probe multiple RCPT TO commands in a single session with PIPELINING
   */
  async probeRcptBatch(emails: string[]): Promise<RcptResult[]> {
    if (!this.isConnected || !this.socket) {
      throw new Error('SMTP session not established');
    }

    this.logger.debug(`Probing ${emails.length} RCPT commands`);
    
    // If PIPELINING is supported, send all RCPT commands at once
    if (this.configService.enablePipelining) {
      return await this.probeWithPipelining(emails);
    } else {
      // Fallback to sequential RCPT commands
      return await this.probeSequentially(emails);
    }
  }

  /**
   * Close the current session
   */
  async closeSession(): Promise<void> {
    if (this.socket && this.isConnected) {
      try {
        // Send QUIT command
        await this.sendCommand(SMTP_CONSTANTS.SMTP_COMMANDS.QUIT);
      } catch (error) {
        this.logger.warn('Error sending QUIT command:', error);
      }
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.isConnected = false;
    this.logger.debug('SMTP session closed');
  }

  /**
   * Check if the session is active
   */
  isActive(): boolean {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return { ...this.sessionStats };
  }

  /**
   * Connect to SMTP host
   */
  private async connectToHost(mxHost: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error('Connection timeout'));
      }, this.configService.connectionTimeout);

      this.socket.connect(SMTP_CONSTANTS.DEFAULT_SMTP_PORT, mxHost, () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Upgrade connection to TLS
   */
  private async upgradeToTls(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not available for TLS upgrade'));
        return;
      }

      const tlsOptions: tls.ConnectionOptions = {
        socket: this.socket,
        rejectUnauthorized: this.configService.tlsRejectUnauthorized,
        minVersion: this.configService.tlsMinVersion as tls.SecureVersion,
        maxVersion: this.configService.tlsMaxVersion as tls.SecureVersion,
      };

      const tlsSocket = tls.connect(tlsOptions, () => {
        this.socket = tlsSocket;
        resolve();
      });

      tlsSocket.on('error', reject);
    });
  }

  /**
   * Send SMTP command and wait for response
   */
  private async sendCommand(command: string): Promise<SmtpResponse> {
    if (!this.socket) {
      throw new Error('Socket not available');
    }

    const startTime = Date.now();
    this.sessionStats.totalCommands++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout: ${command}`));
      }, this.configService.commandTimeout);

      const onData = (data: Buffer) => {
        clearTimeout(timeout);
        this.socket?.off('data', onData);
        this.socket?.off('error', onError);

        const response = this.parseResponse(data.toString());
        const responseTime = Date.now() - startTime;
        
        this.responseTimes.push(responseTime);
        this.updateAverageResponseTime();

        if (response.code.startsWith('2') || response.code.startsWith('3')) {
          this.sessionStats.successfulCommands++;
        } else {
          this.sessionStats.failedCommands++;
        }

        resolve(response);
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        this.socket?.off('data', onData);
        this.socket?.off('error', onError);
        reject(error);
      };

      this.socket.on('data', onData);
      this.socket.on('error', onError);

      this.socket.write(`${command}\r\n`);
    });
  }

  /**
   * Read SMTP response
   */
  private async readResponse(): Promise<SmtpResponse> {
    if (!this.socket) {
      throw new Error('Socket not available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, this.configService.commandTimeout);

      const onData = (data: Buffer) => {
        clearTimeout(timeout);
        this.socket?.off('data', onData);
        this.socket?.off('error', onError);

        const response = this.parseResponse(data.toString());
        resolve(response);
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        this.socket?.off('data', onData);
        this.socket?.off('error', onError);
        reject(error);
      };

      this.socket.on('data', onData);
      this.socket.on('error', onError);
    });
  }

  /**
   * Probe emails with sequential approach (more reliable for real servers)
   */
  private async probeWithPipelining(emails: string[]): Promise<RcptResult[]> {
    if (!this.socket) {
      throw new Error('Socket not available');
    }

    const results: RcptResult[] = [];

    // Send MAIL FROM command
    await this.sendCommand(`MAIL FROM:<${SMTP_CONSTANTS.DEFAULT_SENDER}>`);

    // Send RCPT TO commands sequentially with delays to avoid rate limiting
    for (const email of emails) {
      try {
        const startTime = Date.now();
        const response = await this.sendCommand(`RCPT TO:<${email}>`);
        const responseTime = Date.now() - startTime;

        results.push({
          email,
          responseCode: response.code,
          responseMessage: response.message,
          responseTime,
        });

        // Add delay between commands to avoid being rate limited by providers
        if (emails.length > 1) {
          // Longer delay for major providers like Gmail, Yahoo, etc.
          const isMajorProvider = email.includes('@gmail.com') || 
                                 email.includes('@yahoo.com') || 
                                 email.includes('@outlook.com') || 
                                 email.includes('@hotmail.com');
          const delay = isMajorProvider ? 500 : 200;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        // If we get a connection error, create an error result and continue
        results.push({
          email,
          responseCode: '500',
          responseMessage: 'Connection error',
          responseTime: 0,
        });

        // If it's a critical connection error, break out
        if (error.message.includes('ECONNRESET') || error.message.includes('timeout')) {
          this.logger.warn(`Connection lost while probing ${email}: ${error.message}`);
          break;
        }
      }
    }

    return results;
  }

  /**
   * Probe emails sequentially
   */
  private async probeSequentially(emails: string[]): Promise<RcptResult[]> {
    const results: RcptResult[] = [];

    // Send MAIL FROM command
    await this.sendCommand(`MAIL FROM:<${SMTP_CONSTANTS.DEFAULT_SENDER}>`);

    // Send RCPT TO commands one by one
    for (const email of emails) {
      const startTime = Date.now();
      const response = await this.sendCommand(`RCPT TO:<${email}>`);
      const responseTime = Date.now() - startTime;

      results.push({
        email,
        responseCode: response.code,
        responseMessage: response.message,
        responseTime,
      });
    }

    return results;
  }


  /**
   * Parse SMTP response
   */
  private parseResponse(responseText: string): SmtpResponse {
    const lines = responseText.split('\r\n').filter(line => line.trim());
    const lastLine = lines[lines.length - 1];
    
    const code = lastLine.substring(0, 3);
    const message = lastLine.substring(4);
    const multiline = lines.length > 1;

    return {
      code,
      message,
      multiline,
    };
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.sessionStats.averageResponseTime = sum / this.responseTimes.length;
    }
  }
}
