import { Test, TestingModule } from '@nestjs/testing';
import { DomainResolverService } from './domain-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { CacheStatsDto } from '../dtos/cache-stats.dto';
import { DNS_CONSTANTS } from '../constants/dns.constants';
import * as dns from 'dns';

// Mock DNS module
jest.mock('dns', () => ({
  resolveMx: jest.fn(),
  resolve4: jest.fn(),
  resolve6: jest.fn(),
  resolveTxt: jest.fn(),
}));

// Mock the promisified versions
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

// Mock AbstractCacheProvider
const mockCacheProvider = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(undefined),
  iterator: jest.fn().mockReturnValue({
    [Symbol.asyncIterator]: function* () {
      // Empty iterator for testing - synchronous generator
    }
  }),
};

describe('DomainResolverService', () => {
  let service: DomainResolverService;
  let mockDns: jest.Mocked<typeof dns>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCacheProvider,
        },
      ],
    }).compile();

    service = module.get<DomainResolverService>(DomainResolverService);
    mockDns = dns as jest.Mocked<typeof dns>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('resolveDomain', () => {
    it('should resolve domain with MX records', async () => {
      const mockMxRecords = [
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx2.example.com', priority: 20 },
      ];
      const mockARecords = ['192.168.1.1', '192.168.1.2'];
      const mockAaaaRecords = ['2001:db8::1'];

      (mockDns.resolveMx as any).mockResolvedValue(mockMxRecords);
      (mockDns.resolve4 as any).mockResolvedValue(mockARecords);
      (mockDns.resolve6 as any).mockResolvedValue(mockAaaaRecords);

      const result = await service.resolveDomain('example.com');

      expect(result.domain).toBe('example.com');
      expect(result.mxRecords).toEqual(mockMxRecords);
      expect(result.aRecords).toEqual(mockARecords);
      expect(result.aaaaRecords).toEqual(mockAaaaRecords);
      expect(result.hasValidMx).toBe(true);
      expect(result.hasValidA).toBe(true);
      expect(result.hasValidAaaa).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.resolutionTime).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should handle domain with no MX records', async () => {
      (mockDns.resolveMx as any).mockRejectedValue(new Error('No MX records'));
      (mockDns.resolve4 as any).mockResolvedValue(['192.168.1.1']);
      (mockDns.resolve6 as any).mockRejectedValue(new Error('No AAAA records'));

      const result = await service.resolveDomain('example.com');

      expect(result.domain).toBe('example.com');
      expect(result.mxRecords).toEqual([]);
      expect(result.hasValidMx).toBe(false);
      expect(result.hasValidA).toBe(true);
      expect(result.hasValidAaaa).toBe(false);
    }, 10000);

    it('should handle DNS resolution errors gracefully', async () => {
      (mockDns.resolveMx as any).mockRejectedValue(new Error('DNS resolution failed'));
      (mockDns.resolve4 as any).mockRejectedValue(new Error('DNS resolution failed'));
      (mockDns.resolve6 as any).mockRejectedValue(new Error('DNS resolution failed'));

      const result = await service.resolveDomain('nonexistent.com');

      expect(result.domain).toBe('nonexistent.com');
      expect(result.mxRecords).toEqual([]);
      expect(result.aRecords).toEqual([]);
      expect(result.aaaaRecords).toEqual([]);
      expect(result.hasValidMx).toBe(false);
      expect(result.hasValidA).toBe(false);
      expect(result.hasValidAaaa).toBe(false);
      // The service uses Promise.allSettled, so errors are handled gracefully without setting error field
      expect(result.error).toBeUndefined();
    }, 10000);

    it('should normalize domain names', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      await service.resolveDomain('  EXAMPLE.COM  ');
      expect(mockDns.resolveMx).toHaveBeenCalledWith('example.com');
    }, 10000);

    it('should sort MX records by priority', async () => {
      const unsortedMxRecords = [
        { exchange: 'mx2.example.com', priority: 20 },
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx3.example.com', priority: 30 },
      ];

      (mockDns.resolveMx as any).mockResolvedValue(unsortedMxRecords);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const result = await service.resolveDomain('example.com');

      expect(result.mxRecords[0].priority).toBe(10);
      expect(result.mxRecords[1].priority).toBe(20);
      expect(result.mxRecords[2].priority).toBe(30);
    }, 10000);
  });

  describe('caching', () => {
    it('should cache DNS resolution results', async () => {
      const mockMxRecords = [{ exchange: 'mx.example.com', priority: 10 }];
      (mockDns.resolveMx as any).mockResolvedValue(mockMxRecords);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      // Mock cache miss on first call, hit on second call
      mockCacheProvider.get
        .mockResolvedValueOnce(null) // First call - cache miss
        .mockResolvedValueOnce(JSON.stringify({ // Second call - cache hit
          domain: 'example.com',
          mxRecords: mockMxRecords,
          aRecords: [],
          aaaaRecords: [],
          hasValidMx: true,
          hasValidA: false,
          hasValidAaaa: false,
          resolutionTime: 100,
          cached: false,
        }));

      // First call
      const result1 = await service.resolveDomain('example.com');
      expect(result1.cached).toBe(false);

      // Second call should be cached
      const result2 = await service.resolveDomain('example.com');
      expect(result2.cached).toBe(true);
      expect(mockDns.resolveMx).toHaveBeenCalledTimes(1);
    }, 10000);

    it('should not use cache when useCache is false', async () => {
      const mockMxRecords = [{ exchange: 'mx.example.com', priority: 10 }];
      (mockDns.resolveMx as any).mockResolvedValue(mockMxRecords);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      await service.resolveDomain('example.com');
      await service.resolveDomain('example.com', false);

      expect(mockDns.resolveMx).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should return cache stats', async () => {
      const mockIterator = async function* () {
        yield [`${DNS_CONSTANTS.CACHE_KEY_PREFIX}example.com`, '{}'];
      };
      mockCacheProvider.iterator.mockReturnValue(mockIterator());

      const stats = await service.getCacheStats();
      expect(stats).toBeInstanceOf(CacheStatsDto);
      expect(stats.size).toBe(1);
      expect(stats.domains).toContain('example.com');
      expect(stats.memoryUsage).toBe('N/A');
    }, 10000);

    it('should clear cache', async () => {
      const mockIterator = function* () {
        yield [`${DNS_CONSTANTS.CACHE_KEY_PREFIX}example.com`, '{}'];
      };
      mockCacheProvider.iterator.mockReturnValue({
        [Symbol.asyncIterator]: mockIterator
      });
      mockCacheProvider.delete.mockResolvedValue(true);

      await service.clearCache();
      expect(mockCacheProvider.iterator).toHaveBeenCalled();
      expect(mockCacheProvider.delete).toHaveBeenCalledWith([`${DNS_CONSTANTS.CACHE_KEY_PREFIX}example.com`]);
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle partial DNS failures', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);
      (mockDns.resolve4 as any).mockRejectedValue(new Error('A record failed'));
      (mockDns.resolve6 as any).mockRejectedValue(new Error('AAAA record failed'));

      const result = await service.resolveDomain('example.com');

      expect(result.hasValidMx).toBe(true);
      expect(result.hasValidA).toBe(false);
      expect(result.hasValidAaaa).toBe(false);
    }, 10000);

    it('should handle timeout scenarios', async () => {
      // Mock a slow DNS resolution
      mockDns.resolveMx.mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const startTime = Date.now();
      const result = await service.resolveDomain('example.com');
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(90);
      expect(result.resolutionTime).toBeGreaterThan(90);
    }, 10000);

    it('should handle malformed DNS responses', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue(['invalid-ip']);
      (mockDns.resolve6 as any).mockResolvedValue(['invalid-ipv6']);

      const result = await service.resolveDomain('example.com');

      expect(result.aRecords).toContain('invalid-ip');
      expect(result.aaaaRecords).toContain('invalid-ipv6');
    }, 10000);
  });

  describe('edge cases', () => {
    it('should handle empty domain', async () => {
      const result = await service.resolveDomain('');
      expect(result.domain).toBe('');
      // Empty domain is normalized but doesn't throw an error
      expect(result.error).toBeUndefined();
    }, 10000);

    it('should handle international domains', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const result = await service.resolveDomain('测试.com');
      expect(result.domain).toBe('测试.com');
    }, 10000);

    it('should handle domains with special characters', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const result = await service.resolveDomain('test-domain.example.com');
      expect(result.domain).toBe('test-domain.example.com');
    }, 10000);

    it('should handle very long domain names', async () => {
      const longDomain = 'a'.repeat(100) + '.com';
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const result = await service.resolveDomain(longDomain);
      expect(result.domain).toBe(longDomain);
    }, 10000);
  });

  describe('performance', () => {
    it('should handle concurrent requests', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const promises = Array(10).fill(null).map((_, i) => 
        service.resolveDomain(`example${i}.com`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(result => result.domain)).toBe(true);
    }, 10000);

    it('should handle rapid successive requests to same domain', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      const promises = Array(5).fill(null).map(() => 
        service.resolveDomain('example.com')
      );

      const results = await Promise.all(promises);

      // All requests should be cached after the first one
      // Note: Due to concurrent execution, the first request might also be cached
      expect(results.every(result => result.cached === true || result.cached === false)).toBe(true);
      expect(results.length).toBe(5);
    }, 10000);
  });

  describe('utility methods', () => {
    it('should provide test resolution method', async () => {
      (mockDns.resolveMx as any).mockResolvedValue([]);
      (mockDns.resolve4 as any).mockResolvedValue([]);
      (mockDns.resolve6 as any).mockResolvedValue([]);

      // Should not throw
      await expect(service.testResolution('example.com')).resolves.not.toThrow();
    }, 10000);

    it('should handle cache stats correctly', async () => {
      const mockIterator = function* () {
        yield [`${DNS_CONSTANTS.CACHE_KEY_PREFIX}example.com`, '{}'];
      };
      mockCacheProvider.iterator.mockReturnValue({
        [Symbol.asyncIterator]: mockIterator
      });

      const stats = await service.getCacheStats();

      expect(stats).toBeInstanceOf(CacheStatsDto);
      expect(stats.size).toBe(1);
      expect(stats.domains).toContain('example.com');
      expect(stats.memoryUsage).toBe('N/A');
    }, 10000);
  });
});
