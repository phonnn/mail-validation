import { MxRecord } from 'dns';
import { ResolutionSource } from '../enums/resolution-source.enum';

export interface DomainResolutionResult {
  domain: string;
  mxRecords: Array<MxRecord>;
  aRecords: string[];
  aaaaRecords: string[];
  hasValidMx: boolean;
  hasValidA: boolean;
  hasValidAaaa: boolean;
  resolutionTime: number;
  source: ResolutionSource;
  error?: string;
}
