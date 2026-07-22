import { describe, expect, test } from 'vitest';
import type { Tag } from '../../types';
import { matchSuggestedTags } from './suggested-tag-matching';

const tags: Tag[] = [
  { id: 'tag-react', label: 'React', color: 'blue' },
  { id: 'tag-machine-learning', label: 'Machine Learning', color: 'violet' },
  { id: 'tag-ai', label: 'AI', color: 'amber' },
];

describe('matchSuggestedTags', () => {
  // TASK-069 / REQ-014-AC-003：格式等价建议复用已有标签，且 ID 保持唯一。
  test.each([
    ['# React', 'tag-react'],
    ['machine-learning', 'tag-machine-learning'],
    ['Ｍａｃｈｉｎｅ＿Ｌｅａｒｎｉｎｇ', 'tag-machine-learning'],
    [' ai ', 'tag-ai'],
  ])('建议 %s 映射到现有标签 %s', (suggestion, expectedId) => {
    const result = matchSuggestedTags([suggestion, suggestion], tags);

    expect(result.tagIds).toEqual([expectedId]);
    expect(result.unmatchedLabels).toEqual([]);
  });

  test('不使用子串模糊匹配，避免 React Native 误标为 React', () => {
    const result = matchSuggestedTags(['React Native'], tags);

    expect(result.tagIds).toEqual([]);
    expect(result.unmatchedLabels).toEqual(['React Native']);
  });

  test('规范化键对应多个标签时保持未匹配，避免歧义误标', () => {
    const result = matchSuggestedTags(
      ['machine_learning'],
      [
        ...tags,
        { id: 'tag-machine-learning-alt', label: 'Machine-Learning', color: 'gray' },
      ]
    );

    expect(result.tagIds).toEqual([]);
    expect(result.unmatchedLabels).toEqual(['machine_learning']);
  });

  test('忽略空候选与空建议，并按规范化键去重未匹配建议', () => {
    const result = matchSuggestedTags(
      [' ', 'Unknown Tag', 'unknown-tag'],
      [
        ...tags,
        { id: 'tag-empty', label: ' ', color: 'gray' },
        { id: 'tag-react', label: 'React', color: 'blue' },
      ]
    );

    expect(result.tagIds).toEqual([]);
    expect(result.unmatchedLabels).toEqual(['Unknown Tag']);
  });
});
