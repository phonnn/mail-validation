import { Test, TestingModule } from '@nestjs/testing';
import { MxShardingService } from '@mail-validation/modules/smtp-probe/services/mx-sharding.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { DnsResolverInterface } from '@mail-validation/modules/smtp-probe/interfaces/dns-resolver.interface';
import { DNS_RESOLVER_TOKEN } from '@mail-validation/modules/smtp-probe/constants/dns-tokens.constants';
import { DomainResolutionResult, ResolutionSource } from '@mail-validation/modules/dns-resolver/types';
import { SmtpProbeConfigService } from '@mail-validation/config/smtp-probe';

describe('MxShardingService', () => {
  let service: MxShardingService;
  let mockCacheProvider: jest.Mocked<AbstractCacheProvider>;
  let mockConfigService: jest.Mocked<SmtpProbeConfigService>;
  let mockDnsResolver: jest.Mocked<DnsResolverInterface>;

  beforeEach(async () => {
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      iterator: jest.fn(),
    };

    const mockConfig = {
      maxMxRecords: 10,
      mxCacheTtl: 3600,
    };

    const mockDns = {
      resolveDomain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MxShardingService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
        {
          provide: SmtpProbeConfigService,
          useValue: mockConfig,
        },
        {
          provide: DNS_RESOLVER_TOKEN,
          useValue: mockDns,
        },
      ],
    }).compile();

    service = module.get<MxShardingService>(MxShardingService);
    mockCacheProvider = module.get(AbstractCacheProvider);
    mockConfigService = module.get(SmtpProbeConfigService);
    mockDnsResolver = module.get(DNS_RESOLVER_TOKEN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shardEmailsByMx', () => {
    it('should shard emails by their MX records', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@test.com',
        'user4@test.com',
      ];

      const exampleMxResult: DomainResolutionResult = {
        domain: 'example.com',
        mxRecords: [
          { exchange: 'mx1.example.com', priority: 10 },
          { exchange: 'mx2.example.com', priority: 20 },
        ],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: true,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 100,
        source: ResolutionSource.DNS,
      };

      const testMxResult: DomainResolutionResult = {
        domain: 'test.com',
        mxRecords: [
          { exchange: 'mx1.test.com', priority: 5 },
        ],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: true,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 150,
        source: ResolutionSource.DNS,
      };

      mockDnsResolver.resolveDomain
        .mockResolvedValueOnce(exampleMxResult)
        .mockResolvedValueOnce(testMxResult);

      const result = await service.shardEmailsByMx(emails);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
      expect(result[0].emails).toEqual(['user1@example.com', 'user2@example.com']);
      expect(result[0].mxRecords).toEqual([
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx2.example.com', priority: 20 },
      ]);
      expect(result[1].domain).toBe('test.com');
      expect(result[1].emails).toEqual(['user3@test.com', 'user4@test.com']);
      expect(result[1].mxRecords).toEqual([
        { exchange: 'mx1.test.com', priority: 5 },
      ]);
    });

    it('should handle emails with no MX records', async () => {
      const emails = ['user@nodomain.com'];

      const noMxResult: DomainResolutionResult = {
        domain: 'nodomain.com',
        mxRecords: [],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: false,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 50,
        source: ResolutionSource.ERROR,
      };

      mockDnsResolver.resolveDomain.mockResolvedValue(noMxResult);

      const result = await service.shardEmailsByMx(emails);

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('nodomain.com');
      expect(result[0].emails).toEqual(['user@nodomain.com']);
      expect(result[0].mxRecords).toEqual([]);
    });

    it('should handle DNS resolution errors gracefully', async () => {
      const emails = ['user@error.com'];

      mockDnsResolver.resolveDomain.mockRejectedValue(new Error('DNS resolution failed'));

      const result = await service.shardEmailsByMx(emails);

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('error.com');
      expect(result[0].emails).toEqual(['user@error.com']);
      expect(result[0].mxRecords).toEqual([]);
    });

    it('should deduplicate domains', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ];

      const exampleMxResult: DomainResolutionResult = {
        domain: 'example.com',
        mxRecords: [{ exchange: 'mx1.example.com', priority: 10 }],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: true,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 100,
        source: ResolutionSource.DNS,
      };

      mockDnsResolver.resolveDomain.mockResolvedValue(exampleMxResult);

      const result = await service.shardEmailsByMx(emails);

      expect(result).toHaveLength(1);
      expect(mockDnsResolver.resolveDomain).toHaveBeenCalledTimes(1);
      expect(result[0].emails).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });
  });

  describe('getMxRecords', () => {
    it('should return cached MX records if available', async () => {
      const domain = 'example.com';
      const cachedRecords = [
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx2.example.com', priority: 20 },
      ];

      mockCacheProvider.get.mockResolvedValue(JSON.stringify(cachedRecords));

      const result = await service.getMxRecords(domain);

      expect(result).toEqual(cachedRecords);
      expect(mockCacheProvider.get).toHaveBeenCalledWith('mx:example.com');
      expect(mockDnsResolver.resolveDomain).not.toHaveBeenCalled();
    });

    it('should resolve and cache MX records if not in cache', async () => {
      const domain = 'example.com';
      const dnsResult: DomainResolutionResult = {
        domain: 'example.com',
        mxRecords: [
          { exchange: 'mx1.example.com', priority: 10 },
          { exchange: 'mx2.example.com', priority: 20 },
        ],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: true,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 100,
        source: ResolutionSource.DNS,
      };

      mockCacheProvider.get.mockResolvedValue(null);
      mockDnsResolver.resolveDomain.mockResolvedValue(dnsResult);

      const result = await service.getMxRecords(domain);

      expect(result).toEqual([
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx2.example.com', priority: 20 },
      ]);
      expect(mockCacheProvider.set).toHaveBeenCalledWith(
        'mx:example.com',
        JSON.stringify([
          { exchange: 'mx1.example.com', priority: 10 },
          { exchange: 'mx2.example.com', priority: 20 },
        ]),
        3600,
      );
    });

    it('should not cache empty MX records', async () => {
      const domain = 'example.com';
      const dnsResult: DomainResolutionResult = {
        domain: 'example.com',
        mxRecords: [],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: false,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 100,
        source: ResolutionSource.ERROR,
      };

      mockCacheProvider.get.mockResolvedValue(null);
      mockDnsResolver.resolveDomain.mockResolvedValue(dnsResult);

      const result = await service.getMxRecords(domain);

      expect(result).toEqual([]);
      expect(mockCacheProvider.set).not.toHaveBeenCalled();
    });

    it('should handle DNS resolution errors', async () => {
      const domain = 'error.com';

      mockCacheProvider.get.mockResolvedValue(null);
      mockDnsResolver.resolveDomain.mockRejectedValue(new Error('DNS error'));

      await expect(service.getMxRecords(domain)).rejects.toThrow('DNS error');
    });

    it('should normalize domain names', async () => {
      const domain = 'EXAMPLE.COM';
      const dnsResult: DomainResolutionResult = {
        domain: 'example.com',
        mxRecords: [{ exchange: 'mx1.example.com', priority: 10 }],
        aRecords: [],
        aaaaRecords: [],
        hasValidMx: true,
        hasValidA: false,
        hasValidAaaa: false,
        resolutionTime: 100,
        source: ResolutionSource.DNS,
      };

      mockCacheProvider.get.mockResolvedValue(null);
      mockDnsResolver.resolveDomain.mockResolvedValue(dnsResult);

      await service.getMxRecords(domain);

      expect(mockCacheProvider.get).toHaveBeenCalledWith('mx:example.com');
    });
  });

  describe('clearMxCache', () => {
    it('should clear cache for specific domain', async () => {
      const domain = 'example.com';

      await service.clearMxCache(domain);

      expect(mockCacheProvider.delete).toHaveBeenCalledWith('mx:example.com');
    });

    it('should clear all MX cache entries when no domain specified', async () => {
      mockCacheProvider.iterator = jest.fn().mockReturnValue(
        [
          ['mx:example.com', 'value1'],
          ['mx:test.com', 'value2'],
          ['other:key', 'value3'],
        ][Symbol.iterator](),
      );

      await service.clearMxCache();

      expect(mockCacheProvider.delete).toHaveBeenCalledWith(['mx:example.com', 'mx:test.com']);
    });

    it('should handle case when no MX cache entries exist', async () => {
      mockCacheProvider.iterator = jest
        .fn()
        .mockReturnValue([['other:key', 'value']][Symbol.iterator]());

      await service.clearMxCache();

      expect(mockCacheProvider.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockCacheProvider.iterator = jest.fn().mockReturnValue(
        [
          ['mx:example.com', 'value1'],
          ['mx:test.com', 'value2'],
          ['other:key', 'value3'],
        ][Symbol.iterator](),
      );

      const result = await service.getCacheStats();

      expect(result).toEqual({
        totalEntries: 2,
        domains: ['example.com', 'test.com'],
      });
    });

    it('should return empty stats when no MX cache entries exist', async () => {
      mockCacheProvider.iterator = jest
        .fn()
        .mockReturnValue([['other:key', 'value']][Symbol.iterator]());

      const result = await service.getCacheStats();

      expect(result).toEqual({
        totalEntries: 0,
        domains: [],
      });
    });

    it('should handle case when cache provider has no iterator', async () => {
      mockCacheProvider.iterator = undefined;

      const result = await service.getCacheStats();

      expect(result).toEqual({
        totalEntries: 0,
        domains: [],
      });
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from email address', () => {
      const email = 'user@example.com';
      const result = (service as any).extractDomain(email);
      expect(result).toBe('example.com');
    });

    it('should handle email with subdomain', () => {
      const email = 'user@mail.example.com';
      const result = (service as any).extractDomain(email);
      expect(result).toBe('mail.example.com');
    });

    it('should throw error for invalid email format', () => {
      const invalidEmail = 'invalid-email';
      expect(() => (service as any).extractDomain(invalidEmail)).toThrow();
    });
  });

  describe('normalizeDomain', () => {
    it('should normalize domain to lowercase', () => {
      const domain = 'EXAMPLE.COM';
      const result = (service as any).normalizeDomain(domain);
      expect(result).toBe('example.com');
    });

    it('should trim whitespace from domain', () => {
      const domain = '  example.com  ';
      const result = (service as any).normalizeDomain(domain);
      expect(result).toBe('example.com');
    });

    it('should handle international domains', () => {
      const domain = '测试.com';
      const result = (service as any).normalizeDomain(domain);
      expect(result).toBe('测试.com');
    });
  });
});
