/**
 * 新建书签分类归属：
 * - 主界面处于分类视图时，始终归属当前分类；
 * - 否则采用对话框中的选择（可含 AI 建议）。
 */
export function resolveNewBookmarkCategoryId(input: {
  activeCategoryId: string | null | undefined;
  selectedCategoryId: string;
}): string {
  const active = input.activeCategoryId?.trim();
  if (active) {
    return active;
  }
  return input.selectedCategoryId.trim();
}

/** 仅在未锁定当前分类视图时应用 AI 分类建议。 */
export function shouldApplyAiCategorySuggestion(
  activeCategoryId: string | null | undefined
): boolean {
  return !activeCategoryId?.trim();
}
