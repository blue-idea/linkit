import { describe, expect, test } from 'vitest';

interface LayoutRect {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface LayoutModule {
  detectOverlaps: (rects: LayoutRect[]) => Array<[string, string]>;
  assignMasonryColumns: <T>(items: T[], columnCount: number) => T[][];
}

async function loadLayout(): Promise<Partial<LayoutModule>> {
  return import(/* @vite-ignore */ './layout').catch(() => ({}));
}

describe('视图布局辅助', () => {
  // REQ-015-AC-003：Masonry 条目不得重叠。
  test('detectOverlaps 在矩形相交时返回冲突对', async () => {
    const mod = await loadLayout();
    expect(mod.detectOverlaps).toBeTypeOf('function');
    if (!mod.detectOverlaps) throw new Error('detectOverlaps is required');

    const overlaps = mod.detectOverlaps([
      { id: 'a', top: 0, left: 0, width: 100, height: 80 },
      { id: 'b', top: 40, left: 50, width: 100, height: 80 },
      { id: 'c', top: 200, left: 0, width: 100, height: 40 },
    ]);
    expect(overlaps).toEqual([['a', 'b']]);
  });

  test('assignMasonryColumns 将条目均匀分配到列', async () => {
    const mod = await loadLayout();
    expect(mod.assignMasonryColumns).toBeTypeOf('function');
    if (!mod.assignMasonryColumns) throw new Error('assignMasonryColumns is required');

    const columns = mod.assignMasonryColumns(['a', 'b', 'c', 'd', 'e'], 3);
    expect(columns).toHaveLength(3);
    expect(columns.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(columns[0]).toEqual(['a', 'd']);
    expect(columns[1]).toEqual(['b', 'e']);
    expect(columns[2]).toEqual(['c']);
  });
});
