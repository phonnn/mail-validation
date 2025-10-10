import { Test, TestingModule } from '@nestjs/testing';
import { SmtpSessionService } from '@mail-validation/modules/smtp-probe/services/smtp-session.service';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import * as net from 'net';

jest.mock('net');
jest.mock('tls');

describe('SmtpSessionService', () => {
  let service: SmtpSessionService;
  let mockConfigService: jest.Mocked<SmtpProbeConfigService>;
  let mockSocket: jest.Mocked<net.Socket>;

  beforeEach(async () => {
    // Create mock socket
    mockSocket = {
      connect: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
      once: jest.fn(),
      setEncoding: jest.fn(),
      end: jest.fn(),
    } as any;

    // Create mock config service
    mockConfigService = {
      connectionTimeout: 10000,
      commandTimeout: 5000,
      enablePipelining: true,
      tlsEnabled: true,
      tlsRejectUnauthorized: true,
      tlsMinVersion: 'TLSv1.2',
      tlsMaxVersion: 'TLSv1.3',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpSessionService,
        {
          provide: SmtpProbeConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SmtpSessionService>(SmtpSessionService);
    
    // Mock the socket property directly
    (service as any).socket = mockSocket;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create SMTP session successfully', async () => {
      const mxHost = 'mx.example.com';

      // Mock the service to simulate successful session creation
      jest.spyOn(service as any, 'connectToHost').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'readResponse').mockResolvedValue({ code: '220', message: 'Ready', multiline: false });
      jest.spyOn(service as any, 'sendCommand').mockResolvedValue({ code: '250', message: 'OK', multiline: false });
      jest.spyOn(service as any, 'upgradeToTls').mockResolvedValue(undefined);

      await service.createSession(mxHost);

      expect((service as any).connectToHost).toHaveBeenCalledWith(mxHost);
      expect((service as any).isConnected).toBe(true);
    });

    it('should handle connection timeout', async () => {
      const mxHost = 'mx.example.com';

      // Mock connection failure
      jest.spyOn(service as any, 'connectToHost').mockRejectedValue(new Error('Connection timeout'));

      await expect(service.createSession(mxHost)).rejects.toThrow('Connection timeout');
    });
  });

  describe('probeRcptBatch', () => {
    beforeEach(() => {
      (service as any).isConnected = true;
    });

    it('should probe RCPT batch successfully', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      // Mock the probeRcptBatch method directly
      jest.spyOn(service as any, 'probeWithPipelining').mockResolvedValue([
        { email: 'user1@example.com', responseCode: '250', responseMessage: 'OK', responseTime: 100 },
        { email: 'user2@example.com', responseCode: '250', responseMessage: 'OK', responseTime: 150 },
      ]);

      const results = await service.probeRcptBatch(emails);

      expect(results).toHaveLength(2);
      expect(results[0].email).toBe('user1@example.com');
      expect(results[1].email).toBe('user2@example.com');
    });

    it('should throw error if not connected', async () => {
      (service as any).isConnected = false;

      await expect(service.probeRcptBatch(['user@example.com'])).rejects.toThrow('SMTP session not established');
    });
  });

  describe('closeSession', () => {
    it('should close session successfully', async () => {
      (service as any).socket = mockSocket;
      (service as any).isConnected = true;

      // Mock the sendCommand method
      jest.spyOn(service as any, 'sendCommand').mockResolvedValue({ code: '221', message: 'Goodbye', multiline: false });

      await service.closeSession();

      expect((service as any).sendCommand).toHaveBeenCalledWith('QUIT');
      expect((service as any).isConnected).toBe(false);
    });

    it('should handle close when not connected', async () => {
      (service as any).isConnected = false;

      await expect(service.closeSession()).resolves.toBeUndefined();
    });
  });

  describe('isActive', () => {
    it('should return connection status', () => {
      (service as any).isConnected = true;
      expect(service.isActive()).toBe(true);

      (service as any).isConnected = false;
      expect(service.isActive()).toBe(false);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', () => {
      const stats = service.getSessionStats();

      expect(stats).toHaveProperty('totalCommands');
      expect(stats).toHaveProperty('successfulCommands');
      expect(stats).toHaveProperty('failedCommands');
      expect(stats).toHaveProperty('averageResponseTime');
    });
  });
});
