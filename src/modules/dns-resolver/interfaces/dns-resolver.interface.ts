import {
  DnsResolutionResult,
  DnsResolverResult,
} from '@mail-validation/modules/dns-resolver/types';

export interface DnsResolverInterface<T, TResolutionResult extends DnsResolutionResult<T>> {
  resolve(domain: string): Promise<DnsResolverResult<T>>;
  getCached(domain: string): Promise<T[] | null>;
  setCached(domain: string, records: T[], ttl?: number): Promise<void>;
  clearCache(domain?: string): Promise<void>;
  getCacheStats(): Promise<{ size: number; domains: string[] }>;
  performDnsResolution(domain: string): Promise<TResolutionResult>;
}
