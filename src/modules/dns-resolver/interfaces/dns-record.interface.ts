import { DnsRecordType } from '@mail-validation/modules/dns-resolver/types';

export interface DnsRecord {
  type: DnsRecordType;
  value: string;
  priority?: number;
  ttl?: number;
}
