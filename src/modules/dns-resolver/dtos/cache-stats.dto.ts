export class CacheStatsDto {
  size: number;
  domains: string[];
  memoryUsage: string;

  constructor(data: { size: number; domains: string[]; memoryUsage: string }) {
    this.size = data.size;
    this.domains = data.domains;
    this.memoryUsage = data.memoryUsage;
  }
}
