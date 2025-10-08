import { DnsRecordType } from '@mail-validation/modules/dns-resolver/types';

export class CacheStatsDto {
  size: number;
  domains: string[];
  memoryUsage: string;
  typeStats: Record<DnsRecordType, number>;

  constructor(data: { 
    size: number; 
    domains: string[]; 
    memoryUsage: string;
    typeStats: Record<DnsRecordType, number>;
  }) {
    this.size = data.size;
    this.domains = data.domains;
    this.memoryUsage = data.memoryUsage;
    this.typeStats = data.typeStats;
  }
}
