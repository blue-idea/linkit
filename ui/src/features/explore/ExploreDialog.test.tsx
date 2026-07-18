import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreDialog } from './ExploreDialog';

describe('库内探索对话框', () => {
  test('主题缺口显示显式确认动作且打开时不自动应用', () => {
    const onConfirmGap = vi.fn();
    render(<ExploreDialog recommendations={[{ bookmarkId: 'b-2', score: 0.8, reasons: ['shared-tag'] }]}
      themeGaps={[{ collectionId: 'c-1', bookmarkId: 'b-2', score: 0.7, reasons: ['shared-tag'] }]}
      bookmarkLabels={{ 'b-2': 'Related' }} collectionLabels={{ 'c-1': 'Research' }}
      onClose={() => {}} onSelect={() => {}} onConfirmGap={onConfirmGap} />);
    expect(onConfirmGap).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add Related to Research' }));
    expect(onConfirmGap).toHaveBeenCalledWith('c-1', 'b-2');
  });
});
