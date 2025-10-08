import { Test, TestingModule } from '@nestjs/testing';
import { DomainResolverService } from './domain-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';
import { MxResolverService } from './mx-resolver.service';
import { AResolverService } from './a-resolver.service';
import { AAAAResolverService } from './aaaa-resolver.service';
import { TxtResolverService } from './txt-resolver.service';
import { ResolutionSource, DnsRecordType } from '@mail-validation/modules/dns-resolver/types';

describe('DomainResolverService', () => {
  let service: DomainResolverService;
  let mockCacheProvider: jest.Mocked<AbstractCacheProvider>;
  let mockMxResolver: jest.Mocked<MxResolverService>;
  let mockAResolver: jest.Mocked<AResolverService>;
  let mockAaaaResolver: jest.Mocked<AAAAResolverService>;
  let mockTxtResolver: jest.Mocked<TxtResolverService>;

  beforeEach(async () => {
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      iterator: jest.fn(),
    };

    const mockMx = {
      resolve: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const mockA = {
      resolve: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const mockAaaa = {
      resolve: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const mockTxt = {
      resolve: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
        {
          provide: MxResolverService,
          useValue: mockMx,
        },
        {
          provide: AResolverService,
          useValue: mockA,
        },
        {
          provide: AAAAResolverService,
          useValue: mockAaaa,
        },
        {
          provide: TxtResolverService,
          useValue: mockTxt,
        },
      ],
    }).compile();

    service = module.get<DomainResolverService>(DomainResolverService);
    mockCacheProvider = module.get(AbstractCacheProvider);
    mockMxResolver = module.get(MxResolverService);
    mockAResolver = module.get(AResolverService);
    mockAaaaResolver = module.get(AAAAResolverService);
    mockTxtResolver = module.get(TxtResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveMxRecords', () => {
    it('should delegate to MX resolver', async () => {
      const domain = 'example.com';
      const expectedResult = {
        records: [{ priority: 10, exchange: 'mail1.example.com' }],
        ttl: 86400,
        resolutionTime: 10,
        source: ResolutionSource.DNS,
      };

      mockMxResolver.resolve.mockResolvedValue(expectedResult);

      const result = await service.resolveMxRecords(domain);

      expect(result).toEqual(expectedResult);
      expect(mockMxResolver.resolve).toHaveBeenCalledWith(domain);
    });
  });

  describe('resolveARecords', () => {
    it('should delegate to A resolver', async () => {
      const domain = 'example.com';
      const expectedResult = {
        records: ['192.168.1.1'],
        ttl: 3600,
        resolutionTime: 15,
        source: ResolutionSource.DNS,
      };

      mockAResolver.resolve.mockResolvedValue(expectedResult);

      const result = await service.resolveARecords(domain);

      expect(result).toEqual(expectedResult);
      expect(mockAResolver.resolve).toHaveBeenCalledWith(domain);
    });
  });

  describe('resolveAaaaRecords', () => {
    it('should delegate to AAAA resolver', async () => {
      const domain = 'example.com';
      const expectedResult = {
        records: ['2001:db8::1'],
        ttl: 3600,
        resolutionTime: 20,
        source: ResolutionSource.DNS,
      };

      mockAaaaResolver.resolve.mockResolvedValue(expectedResult);

      const result = await service.resolveAaaaRecords(domain);

      expect(result).toEqual(expectedResult);
      expect(mockAaaaResolver.resolve).toHaveBeenCalledWith(domain);
    });
  });

  describe('resolveTxtRecords', () => {
    it('should delegate to TXT resolver', async () => {
      const domain = 'example.com';
      const expectedResult = {
        records: [['v=spf1 include:_spf.google.com ~all']],
        ttl: 14400,
        resolutionTime: 25,
        source: ResolutionSource.DNS,
      };

      mockTxtResolver.resolve.mockResolvedValue(expectedResult);

      const result = await service.resolveTxtRecords(domain);

      expect(result).toEqual(expectedResult);
      expect(mockTxtResolver.resolve).toHaveBeenCalledWith(domain);
    });
  });

  describe('clearCacheByType', () => {
    it('should clear MX cache when type is mx', async () => {
      mockMxResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByType(DnsRecordType.MX);

      expect(mockMxResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear A cache when type is a', async () => {
      mockAResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByType(DnsRecordType.A);

      expect(mockAResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear AAAA cache when type is aaaa', async () => {
      mockAaaaResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByType(DnsRecordType.AAAA);

      expect(mockAaaaResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear TXT cache when type is txt', async () => {
      mockTxtResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByType(DnsRecordType.TXT);

      expect(mockTxtResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear all cache when type is all', async () => {
      mockMxResolver.clearCache.mockResolvedValue(undefined);
      mockAResolver.clearCache.mockResolvedValue(undefined);
      mockAaaaResolver.clearCache.mockResolvedValue(undefined);
      mockTxtResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByType(DnsRecordType.ALL);

      expect(mockMxResolver.clearCache).toHaveBeenCalled();
      expect(mockAResolver.clearCache).toHaveBeenCalled();
      expect(mockAaaaResolver.clearCache).toHaveBeenCalled();
      expect(mockTxtResolver.clearCache).toHaveBeenCalled();
    });
  });

  describe('clearCacheByDomain', () => {
    it('should clear cache for specific domain from all resolvers', async () => {
      const domain = 'example.com';
      const normalizedDomain = 'example.com';

      mockMxResolver.clearCache.mockResolvedValue(undefined);
      mockAResolver.clearCache.mockResolvedValue(undefined);
      mockAaaaResolver.clearCache.mockResolvedValue(undefined);
      mockTxtResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByDomain(domain);

      expect(mockMxResolver.clearCache).toHaveBeenCalledWith(normalizedDomain);
      expect(mockAResolver.clearCache).toHaveBeenCalledWith(normalizedDomain);
      expect(mockAaaaResolver.clearCache).toHaveBeenCalledWith(normalizedDomain);
      expect(mockTxtResolver.clearCache).toHaveBeenCalledWith(normalizedDomain);
    });

    it('should normalize domain name', async () => {
      const domain = 'EXAMPLE.COM';
      const normalizedDomain = 'example.com';

      mockMxResolver.clearCache.mockResolvedValue(undefined);
      mockAResolver.clearCache.mockResolvedValue(undefined);
      mockAaaaResolver.clearCache.mockResolvedValue(undefined);
      mockTxtResolver.clearCache.mockResolvedValue(undefined);

      await service.clearCacheByDomain(domain);

      expect(mockMxResolver.clearCache).toHaveBeenCalledWith(normalizedDomain);
    });
  });

  describe('testResolution', () => {
    it('should perform test resolution and log results', async () => {
      const domain = 'example.com';
      const mockResult = {
        domain,
        mxRecords: [{ priority: 10, exchange: 'mail1.example.com' }],
        aRecords: ['192.168.1.1'],
        aaaaRecords: ['2001:db8::1'],
        hasValidMx: true,
        hasValidA: true,
        hasValidAaaa: true,
        resolutionTime: 50,
        source: ResolutionSource.DNS,
      };

      jest.spyOn(service, 'resolveDomain').mockResolvedValue(mockResult);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.testResolution(domain);

      expect(service.resolveDomain).toHaveBeenCalledWith(domain);
      expect(loggerSpy).toHaveBeenCalledWith(`Testing DNS resolution for ${domain}`);
      expect(loggerSpy).toHaveBeenCalledWith('Test result:', {
        domain: mockResult.domain,
        hasMx: mockResult.hasValidMx,
        hasA: mockResult.hasValidA,
        hasAaaa: mockResult.hasValidAaaa,
        mxCount: mockResult.mxRecords.length,
        aCount: mockResult.aRecords.length,
        aaaaCount: mockResult.aaaaRecords.length,
        time: mockResult.resolutionTime,
        error: undefined,
      });
    });
  });
});