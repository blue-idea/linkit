import { describe, expect, test } from 'vitest';
import { tags } from './data';

describe('Initial sample data tags', () => {
  test('should have tag t-doc with label Doc', () => {
    const docTag = tags.find((t) => t.id === 't-doc');
    expect(docTag).toBeDefined();
    expect(docTag?.label).toBe('Doc');
  });
});
