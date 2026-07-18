export type CategoryDeleteChoice = 'move-then-delete' | 'recursive-delete' | 'cancel';

export interface CategoryDeleteDecision {
  choice: CategoryDeleteChoice;
  recursiveConfirmed?: boolean;
}

/**
 * 分类含有子节点或书签时，删除前必须弹出三选一确认。
 * REQ-010-AC-003
 */
export function shouldConfirmCategoryDelete(input: {
  childCount: number;
  bookmarkCount: number;
}): boolean {
  return input.childCount > 0 || input.bookmarkCount > 0;
}

/**
 * 将对话框选择映射为可执行策略状态。
 * REQ-010-AC-003~005
 */
export function applyCategoryDeleteDecision(
  decision: CategoryDeleteDecision
): 'cancelled' | 'move-then-delete' | 'await-recursive-confirm' | 'recursive-delete' {
  if (decision.choice === 'cancel') return 'cancelled';
  if (decision.choice === 'move-then-delete') return 'move-then-delete';
  if (!decision.recursiveConfirmed) return 'await-recursive-confirm';
  return 'recursive-delete';
}
