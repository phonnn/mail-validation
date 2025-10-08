import { Test, TestingModule } from '@nestjs/testing';
import { AResolverService } from './a-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';

describe('AResolverService', () => {
  let service: AResolverService;
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
        AResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<AResolverService>(AResolverService);
    mockCacheProvider = module.get(AbstractCacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordTypeTtl', () => {
    it('should return default TTL for A records', () => {
      const ttl = service['getRecordTypeTtl']();
      expect(ttl).toBe(3600); // 1 hour
    });
  });

  describe('performDnsResolution', () => {
    it('should be defined', () => {
      expect(service.performDnsResolution).toBeDefined();
      expect(typeof service.performDnsResolution).toBe('function');
    });
  });
});