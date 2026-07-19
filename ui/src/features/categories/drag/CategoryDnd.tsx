import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { categoryDndId, parseCategoryDndId } from './ids';

/**
 * 分类树 dnd-kit 上下文：指针 + 键盘传感器。
 * REQ-011-AC-001 / REQ-024-AC-006
 */
export function CategoryDndContext({
  children,
  onMoveCategory,
}: {
  children: ReactNode;
  onMoveCategory: (categoryId: string, newParentId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    const categoryId = parseCategoryDndId(activeId);
    const newParentId = parseCategoryDndId(overId);
    if (!categoryId || !newParentId || categoryId === newParentId) return;
    onMoveCategory(categoryId, newParentId);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}

/**
 * 可放置的分类行；拖拽手柄单独挂载，避免吞掉按钮点击。
 */
export function CategoryDndItem({
  categoryId,
  children,
}: {
  categoryId: string;
  children: (api: {
    setDropRef: (node: HTMLElement | null) => void;
    setDragHandleProps: Record<string, unknown>;
    isOver: boolean;
    isDragging: boolean;
    transformStyle: string | undefined;
  }) => ReactNode;
}) {
  const id = categoryDndId(categoryId);
  const { listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  return (
    <>
      {children({
        setDropRef: (node) => {
          setDropRef(node);
          setDragRef(node);
        },
        setDragHandleProps: listeners ?? {},
        isOver,
        isDragging,
        transformStyle: CSS.Translate.toString(transform) ?? undefined,
      })}
    </>
  );
}
