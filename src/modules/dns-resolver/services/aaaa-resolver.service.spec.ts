import { Test, TestingModule } from '@nestjs/testing';
import { AAAAResolverService } from './aaaa-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';

describe('AAAAResolverService', () => {
  let service: AAAAResolverService;
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
        AAAAResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<AAAAResolverService>(AAAAResolverService);
    mockCacheProvider = module.get(AbstractCacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordTypeTtl', () => {
    it('should return default TTL for AAAA records', () => {
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