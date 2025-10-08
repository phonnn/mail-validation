import { Test, TestingModule } from '@nestjs/testing';
import { TxtResolverService } from './txt-resolver.service';
import { AbstractCacheProvider } from '@mail-validation/common/cache/providers/abstract-cache.provider';

describe('TxtResolverService', () => {
  let service: TxtResolverService;
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
        TxtResolverService,
        {
          provide: AbstractCacheProvider,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<TxtResolverService>(TxtResolverService);
    mockCacheProvider = module.get(AbstractCacheProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordTypeTtl', () => {
    it('should return default TTL for TXT records', () => {
      const ttl = service['getRecordTypeTtl']();
      expect(ttl).toBe(14400); // 4 hours
    });
  });

  describe('performDnsResolution', () => {
    it('should be defined', () => {
      expect(service.performDnsResolution).toBeDefined();
      expect(typeof service.performDnsResolution).toBe('function');
    });
  });

  describe('getTxtRecordValues', () => {
    it('should be defined', () => {
      expect(service.getTxtRecordValues).toBeDefined();
      expect(typeof service.getTxtRecordValues).toBe('function');
    });
  });

  describe('findTxtRecordByPrefix', () => {
    it('should be defined', () => {
      expect(service.findTxtRecordByPrefix).toBeDefined();
      expect(typeof service.findTxtRecordByPrefix).toBe('function');
    });
  });
});