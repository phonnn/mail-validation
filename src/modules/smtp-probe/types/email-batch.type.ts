export interface EmailShard {
  emails: string[];
  domain: string;
  mxRecords: MxRecord[];
}

export interface MxRecord {
  exchange: string;
  priority: number;
}
