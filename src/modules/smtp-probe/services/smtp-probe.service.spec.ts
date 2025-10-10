import { Test, TestingModule } from '@nestjs/testing';

import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';
import { SmtpProbeStatus } from '@mail-validation/modules/smtp-probe/enums';
import { EmailShard } from '@mail-validation/modules/smtp-probe/types/email-batch.type';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { MxShardingService } from '@mail-validation/modules/smtp-probe/services/mx-sharding.service';
import { SmtpSessionService } from '@mail-validation/modules/smtp-probe/services/smtp-session.service';

describe('SmtpProbeService', () => {
  let service: SmtpProbeService;
  let mockMxShardingService: jest.Mocked<MxShardingService>;
  let mockSmtpSessionService: jest.Mocked<SmtpSessionService>;
  let mockConfigService: jest.Mocked<SmtpProbeConfigService>;

  beforeEach(async () => {
    const mockMxSharding = {
      shardEmailsByMx: jest.fn(),
      getMxRecords: jest.fn(),
      clearMxCache: jest.fn(),
      getCacheStats: jest.fn(),
    };

    const mockSmtpSession = {
      createSession: jest.fn(),
      probeRcptBatch: jest.fn(),
      closeSession: jest.fn(),
      isActive: jest.fn(),
      getSessionStats: jest.fn(),
    };

    const mockConfig = {
      maxConcurrentBatches: 5,
      defaultBatchSize: 20,
      connectionTimeout: 10000,
      commandTimeout: 5000,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpProbeService,
        {
          provide: MxShardingService,
          useValue: mockMxSharding,
        },
        {
          provide: SmtpSessionService,
          useValue: mockSmtpSession,
        },
        {
          provide: SmtpProbeConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<SmtpProbeService>(SmtpProbeService);
    mockMxShardingService = module.get(MxShardingService);
    mockSmtpSessionService = module.get(SmtpSessionService);
    mockConfigService = module.get(SmtpProbeConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('probeEmail', () => {
    it('should probe a single email successfully', async () => {
      const email = 'user@example.com';
      const mockShards: EmailShard[] = [
        {
          emails: [email],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResult = {
        email,
        responseCode: '250',
        responseMessage: 'OK',
        responseTime: 150,
      };

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue([mockRcptResult]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeEmail(email);

      expect(result.email).toBe(email);
      expect(result.status).toBe(SmtpProbeStatus.VALID);
      expect(result.responseCode).toBe('250');
      expect(result.responseMessage).toBe('OK');
      expect(result.mxHost).toBe('mx1.example.com');
      expect(result.source).toBe('smtp_probe');
    });

    it('should handle invalid email', async () => {
      const email = 'invalid@example.com';
      const mockShards: EmailShard[] = [
        {
          emails: [email],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResult = {
        email,
        responseCode: '550',
        responseMessage: 'User unknown',
        responseTime: 150,
      };

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue([mockRcptResult]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeEmail(email);

      expect(result.status).toBe(SmtpProbeStatus.INVALID);
      expect(result.responseCode).toBe('550');
      expect(result.responseMessage).toBe('User unknown');
    });

    it('should handle catch-all email', async () => {
      const email = 'any@catchall.com';
      const mockShards: EmailShard[] = [
        {
          emails: [email],
          domain: 'catchall.com',
          mxRecords: [
            { exchange: 'mx1.catchall.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResult = {
        email,
        responseCode: '250',
        responseMessage: 'catch-all enabled',
        responseTime: 150,
      };

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue([mockRcptResult]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeEmail(email);

      expect(result.status).toBe(SmtpProbeStatus.CATCH_ALL);
    });

    it('should handle temporary failure', async () => {
      const email = 'temp@example.com';
      const mockShards: EmailShard[] = [
        {
          emails: [email],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResult = {
        email,
        responseCode: '450',
        responseMessage: 'Temporary failure',
        responseTime: 150,
      };

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue([mockRcptResult]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeEmail(email);

      expect(result.status).toBe(SmtpProbeStatus.TEMPORARY_FAILURE);
    });

    it('should handle connection error', async () => {
      const email = 'error@example.com';
      const mockShards: EmailShard[] = [
        {
          emails: [email],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockRejectedValue(new Error('Connection failed'));

      const result = await service.probeEmail(email);

      expect(result.status).toBe(SmtpProbeStatus.ERROR);
      expect(result.error).toBe('All MX hosts failed: Connection failed');
    });
  });

  describe('probeBatch', () => {
    it('should probe a batch of emails', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@test.com',
      ];

      const mockShards: EmailShard[] = [
        {
          emails: ['user1@example.com', 'user2@example.com'],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
        {
          emails: ['user3@test.com'],
          domain: 'test.com',
          mxRecords: [
            { exchange: 'mx1.test.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResults = [
        {
          email: 'user1@example.com',
          responseCode: '250',
          responseMessage: 'OK',
          responseTime: 150,
        },
        {
          email: 'user2@example.com',
          responseCode: '550',
          responseMessage: 'User unknown',
          responseTime: 180,
        },
        {
          email: 'user3@test.com',
          responseCode: '250',
          responseMessage: 'OK',
          responseTime: 170,
        },
      ];

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch
        .mockResolvedValueOnce([mockRcptResults[0], mockRcptResults[1]])
        .mockResolvedValueOnce([mockRcptResults[2]]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeBatch(emails);

      expect(result.totalProcessed).toBe(3);
      expect(result.totalValid).toBe(2);
      expect(result.totalInvalid).toBe(1);
      expect(result.totalCatchAll).toBe(0);
      expect(result.totalErrors).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.mxHosts).toEqual(['mx1.example.com', 'mx1.test.com']);
    });

    it('should handle empty batch', async () => {
      mockMxShardingService.shardEmailsByMx.mockResolvedValue([]);
      
      const result = await service.probeBatch([]);

      expect(result.totalProcessed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should process large batches in chunks', async () => {
      const emails = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);
      const mockShards: EmailShard[] = [
        {
          emails,
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResults = emails.map(email => ({
        email,
        responseCode: '250',
        responseMessage: 'OK',
        responseTime: 150,
      }));

      mockMxShardingService.shardEmailsByMx.mockResolvedValue(mockShards);
      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue(mockRcptResults);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeBatch(emails);

      expect(result.totalProcessed).toBe(150); // 50 emails × 3 MX records
      expect(mockSmtpSessionService.probeRcptBatch).toHaveBeenCalledTimes(3); // 20 + 20 + 10
    });
  });

  describe('probeShardedEmails', () => {
    it('should probe sharded emails', async () => {
      const mockShards: EmailShard[] = [
        {
          emails: ['user1@example.com', 'user2@example.com'],
          domain: 'example.com',
          mxRecords: [
            { exchange: 'mx1.example.com', priority: 10 },
          ],
        },
      ];

      const mockRcptResults = [
        {
          email: 'user1@example.com',
          responseCode: '250',
          responseMessage: 'OK',
          responseTime: 150,
        },
        {
          email: 'user2@example.com',
          responseCode: '550',
          responseMessage: 'User unknown',
          responseTime: 180,
        },
      ];

      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue(mockRcptResults);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeShardedEmails(mockShards);

      expect(result.totalProcessed).toBe(2);
      expect(result.totalValid).toBe(1);
      expect(result.totalInvalid).toBe(1);
      expect(result.mxHosts).toEqual(['mx1.example.com']);
    });

    it('should handle concurrent batches', async () => {
      const mockShards: EmailShard[] = [
        {
          emails: ['user1@example.com'],
          domain: 'example1.com',
          mxRecords: [{ exchange: 'mx1.example1.com', priority: 10 }],
        },
        {
          emails: ['user2@example.com'],
          domain: 'example2.com',
          mxRecords: [{ exchange: 'mx1.example2.com', priority: 10 }],
        },
        {
          emails: ['user3@example.com'],
          domain: 'example3.com',
          mxRecords: [{ exchange: 'mx1.example3.com', priority: 10 }],
        },
        {
          emails: ['user4@example.com'],
          domain: 'example4.com',
          mxRecords: [{ exchange: 'mx1.example4.com', priority: 10 }],
        },
        {
          emails: ['user5@example.com'],
          domain: 'example5.com',
          mxRecords: [{ exchange: 'mx1.example5.com', priority: 10 }],
        },
        {
          emails: ['user6@example.com'],
          domain: 'example6.com',
          mxRecords: [{ exchange: 'mx1.example6.com', priority: 10 }],
        },
      ];

      const mockRcptResult = {
        email: 'user@example.com',
        responseCode: '250',
        responseMessage: 'OK',
        responseTime: 150,
      };

      mockSmtpSessionService.createSession.mockResolvedValue();
      mockSmtpSessionService.probeRcptBatch.mockResolvedValue([mockRcptResult]);
      mockSmtpSessionService.closeSession.mockResolvedValue();

      const result = await service.probeShardedEmails(mockShards);

      expect(result.totalProcessed).toBe(6);
      expect(result.mxHosts).toHaveLength(6);
    });
  });

  describe('getProbeStats', () => {
    it('should return probe statistics', async () => {
      const stats = await service.getProbeStats();

      expect(stats).toEqual({
        totalProbes: 0,
        successfulProbes: 0,
        failedProbes: 0,
        averageResponseTime: 0,
        activeConnections: 0,
      });
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      mockMxShardingService.clearMxCache.mockResolvedValue();

      await service.clearCache();

      expect(mockMxShardingService.clearMxCache).toHaveBeenCalled();
    });
  });

  describe('determineEmailStatus', () => {
    it('should determine valid status for 250 response', () => {
      const result = (service as any).determineEmailStatus('250', 'OK');
      expect(result).toBe(SmtpProbeStatus.VALID);
    });

    it('should determine catch-all status', () => {
      const result = (service as any).determineEmailStatus('250', 'catch-all enabled');
      expect(result).toBe(SmtpProbeStatus.CATCH_ALL);
    });

    it('should determine invalid status for 550 response', () => {
      const result = (service as any).determineEmailStatus('550', 'User unknown');
      expect(result).toBe(SmtpProbeStatus.INVALID);
    });

    it('should determine temporary failure for 450 response', () => {
      const result = (service as any).determineEmailStatus('450', 'Temporary failure');
      expect(result).toBe(SmtpProbeStatus.TEMPORARY_FAILURE);
    });

    it('should determine permanent failure for 500 response', () => {
      const result = (service as any).determineEmailStatus('500', 'Command not recognized');
      expect(result).toBe(SmtpProbeStatus.PERMANENT_FAILURE);
    });

    it('should determine unknown status for unexpected response', () => {
      const result = (service as any).determineEmailStatus('999', 'Unknown response');
      expect(result).toBe(SmtpProbeStatus.UNKNOWN);
    });
  });

  describe('isCatchAllResponse', () => {
    it('should identify catch-all responses', () => {
      const result = (service as any).isCatchAllResponse('catch-all enabled');
      expect(result).toBe(true);
    });

    it('should identify accept-all responses', () => {
      const result = (service as any).isCatchAllResponse('accept all');
      expect(result).toBe(true);
    });

    it('should identify relay responses', () => {
      const result = (service as any).isCatchAllResponse('relay');
      expect(result).toBe(true);
    });

    it('should not identify normal responses as catch-all', () => {
      const result = (service as any).isCatchAllResponse('User verified');
      expect(result).toBe(false);
    });
  });

  describe('createErrorResult', () => {
    it('should create error result', () => {
      const startTime = Date.now();
      const result = (service as any).createErrorResult('user@example.com', 'Test error', startTime);

      expect(result).toEqual({
        email: 'user@example.com',
        status: SmtpProbeStatus.ERROR,
        error: 'Test error',
        probeTime: expect.any(Number),
        source: 'smtp_probe',
        mxHost: undefined,
        mxPriority: undefined,
      });
    });
  });

  describe('calculateBatchStats', () => {
    it('should calculate batch statistics correctly', () => {
      const results = [
        { status: SmtpProbeStatus.VALID, responseTime: 100 },
        { status: SmtpProbeStatus.VALID, responseTime: 200 },
        { status: SmtpProbeStatus.INVALID, responseTime: 150 },
        { status: SmtpProbeStatus.CATCH_ALL, responseTime: 120 },
        { status: SmtpProbeStatus.ERROR, responseTime: 300 },
      ];

      const stats = (service as any).calculateBatchStats(results, 1000);

      expect(stats).toEqual({
        valid: 2,
        invalid: 1,
        catchAll: 1,
        errors: 1,
        averageResponseTime: 174,
      });
    });

    it('should handle empty results', () => {
      const stats = (service as any).calculateBatchStats([], 0);

      expect(stats).toEqual({
        valid: 0,
        invalid: 0,
        catchAll: 0,
        errors: 0,
        averageResponseTime: 0,
      });
    });
  });
});
