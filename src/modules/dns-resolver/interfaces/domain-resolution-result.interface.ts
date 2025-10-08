import { MxRecord } from 'dns';

export interface DomainResolutionResult {
  domain: string;
  mxRecords: Array<MxRecord>;
  aRecords: string[];
  aaaaRecords: string[];
  hasValidMx: boolean;
  hasValidA: boolean;
  hasValidAaaa: boolean;
  resolutionTime: number;
  cached: boolean;
  error?: string;
}
