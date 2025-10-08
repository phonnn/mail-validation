import { ResolutionSource } from '../enums/resolution-source.enum';

export interface DnsResolverResult<T> {
  records: T[];
  ttl: number;
  resolutionTime: number;
  source: ResolutionSource;
  error?: string;
}
