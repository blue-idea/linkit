import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { KnowledgeGraphDialog } from './KnowledgeGraphDialog';

describe('知识网络对话框', () => {
  test('渲染关系标签并在点击节点时定位现有书签', () => {
    const onSelect = vi.fn();
    render(<KnowledgeGraphDialog graph={{
      nodes: [
        { id: 'b-1', label: 'Center', x: 200, y: 160, center: true },
        { id: 'b-2', label: 'Related', x: 200, y: 48, center: false },
      ],
      edges: [{ sourceId: 'b-1', targetId: 'b-2', relation: 'shared-tag', label: 'Shared tag' }],
    }} onClose={() => {}} onSelect={onSelect} />);
    const dialog = screen.getByRole('dialog', { name: 'Knowledge network' });
    expect(within(dialog).getAllByText('Shared tag').length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open Related' }));
    expect(onSelect).toHaveBeenCalledWith('b-2');
  });
});
