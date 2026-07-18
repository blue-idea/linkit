export interface LayoutRect {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

function intersects(a: LayoutRect, b: LayoutRect): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

/**
 * 检测布局矩形是否重叠（用于 Masonry 验收）。
 * REQ-015-AC-003
 */
export function detectOverlaps(rects: LayoutRect[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (intersects(rects[i], rects[j])) {
        pairs.push([rects[i].id, rects[j].id]);
      }
    }
  }
  return pairs;
}

/**
 * 将条目按列轮转分配，形成不重叠的 Masonry 列数据。
 * REQ-015-AC-003
 */
export function assignMasonryColumns<T>(items: T[], columnCount: number): T[][] {
  const columns = Array.from({ length: Math.max(1, columnCount) }, () => [] as T[]);
  items.forEach((item, index) => {
    columns[index % columns.length].push(item);
  });
  return columns;
}
