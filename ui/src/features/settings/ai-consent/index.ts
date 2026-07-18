import { normalizeApiBase } from '../../../services/settings';
import type { AppSettings } from '../../../domain/library';

export type AIConsentRecord = NonNullable<AppSettings['aiConsent']>;

/** 当前 API Base 是否已有匹配的本地数据发送授权。 */
export function consentMatchesApiBase(
  consent: AppSettings['aiConsent'],
  apiBase: string
): boolean {
  if (!consent) return false;
  return normalizeApiBase(consent.apiBase) === normalizeApiBase(apiBase);
}

/**
 * 首次向 AI 发送收藏内容前是否需要弹出授权说明。
 * REQ-019-AC-005 / REQ-019-AC-006
 */
export function requiresAIConsent(settings: AppSettings, apiBase: string): boolean {
  const normalized = normalizeApiBase(apiBase);
  if (!normalized) return false;
  return !consentMatchesApiBase(settings.aiConsent, normalized);
}

export function buildConsentRecord(apiBase: string, grantedAt: string): AIConsentRecord {
  return {
    apiBase: normalizeApiBase(apiBase),
    grantedAt,
  };
}
