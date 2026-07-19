import { useState } from 'react';
import { Icon, Button } from '../../../components/ui';
import type { Category } from '../../../types';
import { buildCategoryTree } from '../utils';

function getDescendantIds(categories: Category[], parentId: string): Set<string> {
  const descendants = new Set<string>([parentId]);
  const childrenMap: { [parentId: string]: string[] } = {};
  categories.forEach((c) => {
    if (c.parentId) {
      if (!childrenMap[c.parentId]) {
        childrenMap[c.parentId] = [];
      }
      childrenMap[c.parentId].push(c.id);
    }
  });

  function visit(id: string) {
    const children = childrenMap[id] || [];
    children.forEach((childId) => {
      descendants.add(childId);
      visit(childId);
    });
  }

  visit(parentId);
  return descendants;
}

/**
 * 键盘可达的分类移动目标选择（等价拖拽落点）。
 * REQ-011-AC-001 / REQ-024-AC-006
 */
export function MoveCategoryDialog({
  categoryId,
  categories,
  onCancel,
  onConfirm,
}: {
  categoryId: string;
  categories: Category[];
  onCancel: () => void;
  onConfirm: (newParentId: string | null) => void;
}) {
  const current = categories.find((category) => category.id === categoryId);
  const [targetParentId, setTargetParentId] = useState<string>('__root__');

  const excludedIds = getDescendantIds(categories, categoryId);
  const allowedCategories = categories.filter((c) => !excludedIds.has(c.id));
  const treeOptions = buildCategoryTree(allowedCategories);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-category-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name="Folder" size={16} className="text-accent-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="move-category-title" className="text-[15px] font-semibold text-ink-100">
              Move category
            </h2>
            <p className="text-[12px] text-ink-400 mt-1">
              Move “{current?.name ?? 'Category'}” under a new parent. Invalid targets are rejected.
            </p>
            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="move-category-parent">
              New parent
            </label>
            <select
              id="move-category-parent"
              aria-label="New parent category"
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring"
            >
              <option value="__root__" className="bg-ink-900 text-ink-100">Root (no parent)</option>
              {treeOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-ink-900 text-ink-100">
                  {'\u00A0\u00A0'.repeat(option.level) + (option.level > 0 ? '└─ ' : '') + option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            aria-label="Confirm move category"
            onClick={() => {
              const newParentId = targetParentId === '__root__' ? null : targetParentId;
              onConfirm(newParentId);
            }}
          >
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}
