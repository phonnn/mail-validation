import { DomainResolutionResult } from '@mail-validation/modules/dns-resolver/interfaces';

export class DomainResolutionDto implements DomainResolutionResult {
  domain: string;
  mxRecords: Array<{ exchange: string; priority: number }>;
  aRecords: string[];
  aaaaRecords: string[];
  hasValidMx: boolean;
  hasValidA: boolean;
  hasValidAaaa: boolean;
  resolutionTime: number;
  cached: boolean;
  error?: string;

  constructor(data: DomainResolutionResult) {
    this.domain = data.domain;
    this.mxRecords = data.mxRecords;
    this.aRecords = data.aRecords;
    this.aaaaRecords = data.aaaaRecords;
    this.hasValidMx = data.hasValidMx;
    this.hasValidA = data.hasValidA;
    this.hasValidAaaa = data.hasValidAaaa;
    this.resolutionTime = data.resolutionTime;
    this.cached = data.cached;
    this.error = data.error;
  }
}
