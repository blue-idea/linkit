import { describe, expect, test } from 'vitest';
import {
  buildManualFallbackPreview,
  resolveBookmarkAnalysis,
  type MetadataFetchResult,
} from './analysis';
import { applyDeleteDecision, shouldConfirmBookmarkDelete } from './delete-confirm';

describe('书签入库分析', () => {
  // REQ-006-AC-001：有效 URL 进入分析/确认预览，确认前不产生入库载荷。
  test('resolveBookmarkAnalysis 在元数据成功时返回可编辑预览且 stage 为 review', async () => {
    const fetchMetadata = async (): Promise<MetadataFetchResult> => ({
      ok: true,
      title: 'Fetched Title',
      description: 'Fetched description',
      contentText: 'Body',
    });
    const result = await resolveBookmarkAnalysis({
      url: 'https://example.test/page',
      titleHint: '',
      fetchMetadata,
    });
    expect(result.stage).toBe('review');
    expect(result.preview.title).toBe('Fetched Title');
    expect(result.fallbackMessage).toBeNull();
    expect(result.source).toBe('metadata');
  });

  // REQ-006-AC-003：抓取失败时英文降级，允许手动填写，不伪造 AI 结果。
  test('resolveBookmarkAnalysis 在抓取失败时返回英文降级与手动预览', async () => {
    const fetchMetadata = async (): Promise<MetadataFetchResult> => ({
      ok: false,
      code: 'METADATA_FETCH_FAILED',
      message: 'Failed to fetch page metadata',
    });
    const result = await resolveBookmarkAnalysis({
      url: 'https://example.test/down',
      titleHint: 'My Title',
      fetchMetadata,
    });
    expect(result.stage).toBe('review');
    expect(result.source).toBe('manual');
    expect(result.fallbackMessage).toMatch(/could not fetch|manual/i);
    expect(result.preview.title).toBe('My Title');
    expect(result.preview.aiSummary).toBe('');
    expect(result.preview.suggestedTags).toEqual([]);
  });

  test('buildManualFallbackPreview 不注入伪 AI 摘要', () => {
    const preview = buildManualFallbackPreview('https://example.test/x', '');
    expect(preview.aiSummary).toBe('');
    expect(preview.suggestedTags).toEqual([]);
    expect(preview.title).toBe('example.test');
  });
});

describe('书签删除确认', () => {
  // REQ-007-AC-003：删除前必须确认。
  test('shouldConfirmBookmarkDelete 恒为 true', () => {
    expect(shouldConfirmBookmarkDelete()).toBe(true);
  });

  test('applyDeleteDecision 仅在确认后执行', () => {
    expect(applyDeleteDecision({ confirmed: false })).toBe('blocked');
    expect(applyDeleteDecision({ confirmed: true })).toBe('deleted');
  });
});
