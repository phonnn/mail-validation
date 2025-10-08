import { Test, TestingModule } from '@nestjs/testing';
import { MxResolverService } from './mx-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';

describe('MxResolverService', () => {
  let service: MxResolverService;
  let mockCacheProvider: jest.Mocked<AbstractCacheProvider>;

  beforeEach(async () => {
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      iterator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MxResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<MxResolverService>(MxResolverService);
    mockCacheProvider = module.get(AbstractCacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordTypeTtl', () => {
    it('should return default TTL for MX records', () => {
      const ttl = service['getRecordTypeTtl']();
      expect(ttl).toBe(86400); // 24 hours
    });
  });

  describe('performDnsResolution', () => {
    it('should be defined', () => {
      expect(service.performDnsResolution).toBeDefined();
      expect(typeof service.performDnsResolution).toBe('function');
    });
  });
});