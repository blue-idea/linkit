/** 浮层优先级：越靠前越上层（Esc 先关）。REQ-024-AC-004 */

export type OverlayKind =
  | 'seed-confirm'
  | 'delete-bookmark'
  | 'delete-category'
  | 'delete-collection'
  | 'category-form'
  | 'category-icon'
  | 'collection-form'
  | 'add-bookmarks'
  | 'remove-from-collection'
  | 'compose'
  | 'spotlight'
  | 'new-bookmark'
  | 'insights'
  | 'explore'
  | 'health'
  | 'settings';

export const OVERLAY_PRIORITY: OverlayKind[] = [
  'seed-confirm',
  'delete-bookmark',
  'delete-category',
  'delete-collection',
  'category-form',
  'category-icon',
  'collection-form',
  'add-bookmarks',
  'remove-from-collection',
  'compose',
  'spotlight',
  'new-bookmark',
  'insights',
  'explore',
  'health',
  'settings',
];

/** 返回当前打开的最上层浮层 ID；无打开浮层时返回 null。 */
export function resolveTopOverlay(
  open: Partial<Record<OverlayKind, boolean>>
): OverlayKind | null {
  for (const kind of OVERLAY_PRIORITY) {
    if (open[kind]) return kind;
  }
  return null;
}
