import { DomainResolutionResult } from '@mail-validation/modules/dns-resolver/types';

export interface DnsResolverInterface {
  /**
   * Resolve domain and get complete resolution result including MX records
   * @param domain The domain to resolve
   * @returns Promise resolving to complete domain resolution result
   */
  resolveDomain(domain: string): Promise<DomainResolutionResult>;
}
