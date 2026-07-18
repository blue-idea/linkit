import { describe, expect, it } from 'vitest';
import {
  buildConsentRecord,
  consentMatchesApiBase,
  requiresAIConsent,
} from './index';
import { createAppSettings } from '../../../testing/factories';

describe('AI consent', () => {
  // REQ-019-AC-005：未授权时必须要求确认。
  it('requiresAIConsent 在无授权时返回 true', () => {
    const settings = createAppSettings({
      ai: { apiBase: 'https://api.example.test/v1', model: 'm' },
      aiConsent: null,
    });
    expect(requiresAIConsent(settings, 'https://api.example.test/v1')).toBe(true);
  });

  // REQ-019-AC-006：API Base 变化后原授权失效。
  it('requiresAIConsent 在 API Base 变化后返回 true', () => {
    const settings = createAppSettings({
      ai: { apiBase: 'https://other.example.test/v1', model: 'm' },
      aiConsent: {
        apiBase: 'https://api.example.test/v1',
        grantedAt: '2026-07-18T09:00:00.000Z',
      },
    });
    expect(requiresAIConsent(settings, 'https://other.example.test/v1')).toBe(true);
    expect(consentMatchesApiBase(settings.aiConsent, 'https://other.example.test/v1')).toBe(false);
  });

  it('requiresAIConsent 在匹配授权时返回 false', () => {
    const settings = createAppSettings({
      ai: { apiBase: 'https://api.example.test/v1/', model: 'm' },
      aiConsent: {
        apiBase: 'https://api.example.test/v1',
        grantedAt: '2026-07-18T09:00:00.000Z',
      },
    });
    expect(requiresAIConsent(settings, 'https://api.example.test/v1')).toBe(false);
  });

  // REQ-019-AC-005：确认后写入本地 consent 记录。
  it('buildConsentRecord 使用规范化 apiBase 与时间戳', () => {
    const record = buildConsentRecord('https://api.example.test/v1/', '2026-07-18T10:00:00.000Z');
    expect(record).toEqual({
      apiBase: 'https://api.example.test/v1',
      grantedAt: '2026-07-18T10:00:00.000Z',
    });
  });
});
