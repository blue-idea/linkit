/**
 * 重复书签扫描配置。
 * Same domain 匹配时排除的高流量站点；精确 URL 匹配不受影响。
 */
export const DUPLICATE_SCAN_CONFIG = {
  /** 规范化后（小写、去 www.）命中则不产生 Same domain 候选对 */
  sameDomainExcludedHosts: ['github.com', 'youtube.com'] as const,
} as const;

/** 将书签 domain 规范化为可比较的主机名。 */
export function normalizeDuplicateHost(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

/** 该主机是否禁止按同域名判定重复。 */
export function isSameDomainDuplicateExcluded(domain: string): boolean {
  const host = normalizeDuplicateHost(domain);
  return (DUPLICATE_SCAN_CONFIG.sameDomainExcludedHosts as readonly string[]).includes(host);
}
