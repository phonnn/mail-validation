import { Test, TestingModule } from '@nestjs/testing';
import { SmtpProbeController } from '@mail-validation/modules/smtp-probe/controllers/smtp-probe.controller';
import { SmtpProbeService } from '@mail-validation/modules/smtp-probe/services/smtp-probe.service';
import { SmtpProbeStatus, SmtpResponseCode } from '@mail-validation/modules/smtp-probe/enums';

describe('SmtpProbeController', () => {
  let controller: SmtpProbeController;
  let mockSmtpProbeService: jest.Mocked<SmtpProbeService>;

  beforeEach(async () => {
    const mockSmtpProbe = {
      probeEmail: jest.fn(),
      probeBatch: jest.fn(),
      getProbeStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmtpProbeController],
      providers: [
        {
          provide: SmtpProbeService,
          useValue: mockSmtpProbe,
        },
      ],
    }).compile();

    controller = module.get<SmtpProbeController>(SmtpProbeController);
    mockSmtpProbeService = module.get(SmtpProbeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('probeSingleEmail', () => {
    it('should probe a single email successfully', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const mockResult = {
        email: 'user@example.com',
        status: SmtpProbeStatus.VALID,
        responseCode: SmtpResponseCode.OK,
        responseMessage: 'OK',
        mxHost: 'mx1.example.com',
        probeTime: 150,
        source: 'smtp_probe' as const,
      };

      mockSmtpProbeService.probeEmail.mockResolvedValue(mockResult);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockSmtpProbeService.probeEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should handle probe email error', async () => {
      const probeEmailDto = { email: 'invalid@example.com' };
      const error = new Error('Connection failed');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: false,
        error: 'Connection failed',
      });
    });

    it('should handle invalid email format', async () => {
      const probeEmailDto = { email: 'invalid-email' };
      const error = new Error('Invalid email format');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: false,
        error: 'Invalid email format',
      });
    });
  });

  describe('probeBatchEmails', () => {
    it('should probe a batch of emails successfully', async () => {
      const probeBatchDto = {
        emails: [
          'user1@example.com',
          'user2@example.com',
          'user3@example.com',
        ],
      };

      const mockResult = {
        totalProcessed: 3,
        totalValid: 2,
        totalInvalid: 1,
        totalCatchAll: 0,
        totalErrors: 0,
        totalTime: 500,
        averageResponseTime: 167,
        results: [
          {
            email: 'user1@example.com',
            status: SmtpProbeStatus.VALID,
            responseCode: SmtpResponseCode.OK,
            responseMessage: 'OK',
            mxHost: 'mx1.example.com',
            probeTime: 150,
            source: 'smtp_probe' as const,
          },
          {
            email: 'user2@example.com',
            status: SmtpProbeStatus.VALID,
            responseCode: SmtpResponseCode.OK,
            responseMessage: 'OK',
            mxHost: 'mx1.example.com',
            probeTime: 180,
            source: 'smtp_probe' as const,
          },
          {
            email: 'user3@example.com',
            status: SmtpProbeStatus.INVALID,
            responseCode: SmtpResponseCode.MAILBOX_NOT_FOUND,
            responseMessage: 'User unknown',
            mxHost: 'mx1.example.com',
            probeTime: 170,
            source: 'smtp_probe' as const,
          },
        ],
        mxHosts: ['mx1.example.com'],
      };

      mockSmtpProbeService.probeBatch.mockResolvedValue(mockResult);

      const result = await controller.probeBatchEmails(probeBatchDto);

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockSmtpProbeService.probeBatch).toHaveBeenCalledWith([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });

    it('should handle empty batch', async () => {
      const probeBatchDto = { emails: [] };
      const mockResult = {
        totalProcessed: 0,
        totalValid: 0,
        totalInvalid: 0,
        totalCatchAll: 0,
        totalErrors: 0,
        totalTime: 0,
        averageResponseTime: 0,
        results: [],
        mxHosts: [],
      };

      mockSmtpProbeService.probeBatch.mockResolvedValue(mockResult);

      const result = await controller.probeBatchEmails(probeBatchDto);

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
    });

    it('should handle batch probe error', async () => {
      const probeBatchDto = {
        emails: ['user1@example.com', 'user2@example.com'],
      };
      const error = new Error('Batch processing failed');

      mockSmtpProbeService.probeBatch.mockRejectedValue(error);

      const result = await controller.probeBatchEmails(probeBatchDto);

      expect(result).toEqual({
        success: false,
        error: 'Batch processing failed',
      });
    });

    it('should handle large batch', async () => {
      const largeEmailList = Array.from(
        { length: 1000 },
        (_, i) => `user${i}@example.com`,
      );
      const probeBatchDto = { emails: largeEmailList };

      const mockResult = {
        totalProcessed: 1000,
        totalValid: 800,
        totalInvalid: 150,
        totalCatchAll: 30,
        totalErrors: 20,
        totalTime: 5000,
        averageResponseTime: 200,
        results: [],
        mxHosts: ['mx1.example.com'],
      };

      mockSmtpProbeService.probeBatch.mockResolvedValue(mockResult);

      const result = await controller.probeBatchEmails(probeBatchDto);

      expect(result.success).toBe(true);
      expect(result.data?.totalProcessed).toBe(1000);
    });
  });

  describe('getProbeStats', () => {
    it('should return probe statistics successfully', async () => {
      const mockStats = {
        totalProbes: 1500,
        successfulProbes: 1200,
        failedProbes: 300,
        averageResponseTime: 180,
        activeConnections: 5,
      };

      mockSmtpProbeService.getProbeStats.mockResolvedValue(mockStats);

      const result = await controller.getProbeStats();

      expect(result).toEqual({
        success: true,
        data: mockStats,
      });
      expect(mockSmtpProbeService.getProbeStats).toHaveBeenCalled();
    });

    it('should handle stats retrieval error', async () => {
      const error = new Error('Failed to retrieve stats');

      mockSmtpProbeService.getProbeStats.mockRejectedValue(error);

      const result = await controller.getProbeStats();

      expect(result).toEqual({
        success: false,
        error: 'Failed to retrieve stats',
      });
    });

    it('should return zero stats for new service', async () => {
      const mockStats = {
        totalProbes: 0,
        successfulProbes: 0,
        failedProbes: 0,
        averageResponseTime: 0,
        activeConnections: 0,
      };

      mockSmtpProbeService.getProbeStats.mockResolvedValue(mockStats);

      const result = await controller.getProbeStats();

      expect(result).toEqual({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      mockSmtpProbeService.clearCache.mockResolvedValue();

      const result = await controller.clearCache();

      expect(result).toEqual({
        success: true,
        message: 'Cache cleared successfully',
      });
      expect(mockSmtpProbeService.clearCache).toHaveBeenCalled();
    });

    it('should handle cache clear error', async () => {
      const error = new Error('Failed to clear cache');

      mockSmtpProbeService.clearCache.mockRejectedValue(error);

      const result = await controller.clearCache();

      expect(result).toEqual({
        success: false,
        error: 'Failed to clear cache',
      });
    });
  });

  describe('DTO Validation', () => {
    it('should validate email format in single probe', async () => {
      const invalidDto = { email: 'invalid-email' };
      const error = new Error('Invalid email format');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(invalidDto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should validate batch size limits', async () => {
      const largeBatch = {
        emails: Array.from({ length: 2000 }, (_, i) => `user${i}@example.com`),
      };
      const error = new Error('Batch size exceeds limit');

      mockSmtpProbeService.probeBatch.mockRejectedValue(error);

      const result = await controller.probeBatchEmails(largeBatch);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Batch size exceeds limit');
    });

    it('should validate email format in batch', async () => {
      const invalidBatch = {
        emails: ['valid@example.com', 'invalid-email', 'another@test.com'],
      };
      const error = new Error('Invalid email format in batch');

      mockSmtpProbeService.probeBatch.mockRejectedValue(error);

      const result = await controller.probeBatchEmails(invalidBatch);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format in batch');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const error = new Error('Request timeout');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: false,
        error: 'Request timeout',
      });
    });

    it('should handle service unavailable', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const error = new Error('Service temporarily unavailable');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: false,
        error: 'Service temporarily unavailable',
      });
    });

    it('should handle unexpected errors', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const error = new Error('Unexpected server error');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected server error',
      });
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for successful operations', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const mockResult = {
        email: 'user@example.com',
        status: SmtpProbeStatus.VALID,
        responseCode: SmtpResponseCode.OK,
        responseMessage: 'OK',
        mxHost: 'mx1.example.com',
        probeTime: 150,
        source: 'smtp_probe' as const,
      };

      mockSmtpProbeService.probeEmail.mockResolvedValue(mockResult);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).not.toHaveProperty('error');
      expect(result.success).toBe(true);
    });

    it('should return consistent response format for failed operations', async () => {
      const probeEmailDto = { email: 'user@example.com' };
      const error = new Error('Test error');

      mockSmtpProbeService.probeEmail.mockRejectedValue(error);

      const result = await controller.probeSingleEmail(probeEmailDto);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('data');
      expect(result.success).toBe(false);
    });
  });
});
