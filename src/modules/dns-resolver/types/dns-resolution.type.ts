import { MxRecord } from "dns";

// Simple, clean resolution result types
export interface DnsResolutionResult<T> {
  records: T[];
  ttl?: number; // Optional TTL - only present for A/AAAA records
}

// Specific types for different record types (for type safety)
export type AResolutionResult = DnsResolutionResult<string> & { ttl: number };
export type AAAAResolutionResult = DnsResolutionResult<string> & { ttl: number };
export type MxResolutionResult = DnsResolutionResult<MxRecord>;
export type TxtResolutionResult = DnsResolutionResult<string[]>;
