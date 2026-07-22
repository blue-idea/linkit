import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { NewBookmarkDialog } from './Dialogs';

type TestWindow = Window & {
  go?: {
    metadata?: {
      Service?: {
        FetchMetadata?: (request: { url: string }) => Promise<{
          title: string;
          description: string;
          contentText: string;
          faviconUrl: string | null;
          faviconDataUrl: string | null;
        }>;
      };
    };
    ai?: {
      Service?: {
        AnalyzeBookmark?: () => Promise<{
          title: string;
          description: string;
          summary: string;
          suggestedCategoryId: string | null;
          suggestedTags: string[];
        }>;
      };
    };
  };
};

afterEach(() => {
  cleanup();
  delete (window as TestWindow).go;
});

describe('NewBookmarkDialog AI 标签保存', () => {
  // TASK-069 / REQ-006-AC-002 / REQ-014-AC-003：格式等价的建议应复用已有标签并随保存写入。
  test('AI 返回带前导井号的候选标签时保存已有 Tag ID', async () => {
    (window as TestWindow).go = {
      metadata: {
        Service: {
          FetchMetadata: async () => ({
            title: 'React Documentation',
            description: 'Official React documentation.',
            contentText: 'React components, hooks, and API reference.',
            faviconUrl: null,
            faviconDataUrl: null,
          }),
        },
      },
      ai: {
        Service: {
          AnalyzeBookmark: async () => ({
            title: 'React Documentation',
            description: 'Official React documentation.',
            summary: 'React API reference and guides.',
            suggestedCategoryId: null,
            suggestedTags: ['# React'],
          }),
        },
      },
    };

    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <NewBookmarkDialog
        open
        initialUrl=""
        bookmarks={[]}
        categories={[]}
        tags={[{ id: 'tag-react', label: 'React', color: 'blue' }]}
        collections={[]}
        aiContext={{ apiBase: 'https://api.example.test/v1', model: 'test-model', locale: 'en' }}
        onClose={() => undefined}
        onCreate={onCreate}
      />
    );

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://react.dev');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    await user.click(await screen.findByRole('button', { name: 'Save bookmark' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['tag-react'] }));
  });
});
