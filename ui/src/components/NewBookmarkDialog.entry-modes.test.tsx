import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { NewBookmarkDialog } from './Dialogs';

type MetadataPayload = {
  title: string;
  description: string;
  contentText: string;
  faviconUrl: string | null;
  faviconDataUrl: string | null;
};

type AIResult = {
  title: string;
  description: string;
  summary: string;
  suggestedCategoryId: string | null;
  suggestedTags: string[];
};

type TestWindow = Window & {
  go?: {
    metadata?: {
      Service?: {
        FetchMetadata?: (request: { url: string }) => Promise<MetadataPayload>;
      };
    };
    ai?: {
      Service?: {
        AnalyzeBookmark?: () => Promise<AIResult>;
      };
    };
  };
};

function dialogElement(input: {
  open?: boolean;
  initialUrl?: string;
  bookmarks?: Array<{ url: string }>;
  onCreate: ReturnType<typeof vi.fn>;
}) {
  return (
    <NewBookmarkDialog
      open={input.open ?? true}
      initialUrl={input.initialUrl ?? ''}
      bookmarks={input.bookmarks ?? []}
      categories={[]}
      tags={[]}
      collections={[]}
      aiContext={{ apiBase: 'https://api.example.test/v1', model: 'test-model', locale: 'en' }}
      onClose={() => undefined}
      onCreate={input.onCreate}
    />
  );
}

function renderDialog() {
  const onCreate = vi.fn();
  render(dialogElement({ onCreate }));
  return { onCreate };
}

function installWailsSpies(metadata?: Partial<MetadataPayload>) {
  const fetchMetadata = vi.fn(async (): Promise<MetadataPayload> => ({
    title: 'Metadata title',
    description: 'Metadata description',
    contentText: 'Metadata content',
    faviconUrl: null,
    faviconDataUrl: null,
    ...metadata,
  }));
  const analyzeBookmark = vi.fn(async (): Promise<AIResult> => ({
    title: 'AI title',
    description: 'AI description',
    summary: 'AI summary',
    suggestedCategoryId: null,
    suggestedTags: [],
  }));
  (window as TestWindow).go = {
    metadata: { Service: { FetchMetadata: fetchMetadata } },
    ai: { Service: { AnalyzeBookmark: analyzeBookmark } },
  };
  return { fetchMetadata, analyzeBookmark };
}

afterEach(() => {
  cleanup();
  delete (window as TestWindow).go;
  vi.restoreAllMocks();
});

describe('NewBookmarkDialog Manual 与 Smart 入口', () => {
  // TASK-071 / REQ-006-AC-009：Manual 只读取元数据，禁止调用 AI。
  test('点击 Manual 进入元数据预览且 AI 调用次数为零', async () => {
    const { fetchMetadata, analyzeBookmark } = installWailsSpies();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/manual');

    expect(screen.getByRole('button', { name: 'Manual' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Smart' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Analyze' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Manual' }));

    expect(await screen.findByRole('button', { name: 'Save bookmark' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Metadata title');
    expect(screen.getByRole('textbox', { name: 'Bookmark description' })).toHaveValue('Metadata description');
    expect(fetchMetadata).toHaveBeenCalledOnce();
    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  // TASK-071 / REQ-006-AC-006：Manual 应把元数据 favicon 带入显式保存结果。
  test('Manual 元数据 favicon 在确认保存后写入书签', async () => {
    const faviconUrl = 'https://example.test/favicon.png';
    const { analyzeBookmark } = installWailsSpies({ faviconUrl });
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/favicon');
    await user.click(screen.getByRole('button', { name: 'Manual' }));
    await user.click(await screen.findByRole('button', { name: 'Save bookmark' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ favicon: faviconUrl }));
    expect(analyzeBookmark).not.toHaveBeenCalled();
  });

  // TASK-073 / REQ-006-AC-010：显式保存时写入随机渐变键，不再固定为 blue。
  test('Manual 确认保存时写入随机渐变缩略图', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);
    installWailsSpies({ faviconUrl: 'https://example.test/favicon.png' });
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/gradient');
    await user.click(screen.getByRole('button', { name: 'Manual' }));
    const saveButton = await screen.findByRole('button', { name: 'Save bookmark' });

    expect(randomSpy).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();

    await user.click(saveButton);

    expect(randomSpy).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ thumbnail: 'violet' }));
  });

  // TASK-071 / REQ-006-AC-005：Manual 同样必须在请求前拦截重复 URL。
  test('Manual 遇到重复 URL 时不调用元数据或 AI', async () => {
    const { fetchMetadata, analyzeBookmark } = installWailsSpies();
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(dialogElement({
      bookmarks: [{ url: 'https://example.test/duplicate' }],
      onCreate,
    }));

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/duplicate');
    await user.click(screen.getByRole('button', { name: 'Manual' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bookmark URL already exists');
    expect(fetchMetadata).not.toHaveBeenCalled();
    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  // TASK-071 / REQ-006-AC-009：Smart 按钮保留现有 AI 分析路径。
  test('点击 Smart 调用一次元数据与一次 AI 分析', async () => {
    const { fetchMetadata, analyzeBookmark } = installWailsSpies();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/smart');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    expect(await screen.findByRole('button', { name: 'Save bookmark' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('AI title');
    expect(fetchMetadata).toHaveBeenCalledOnce();
    expect(analyzeBookmark).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
  });

  // TASK-071 / REQ-006-AC-009：URL 输入框 Enter 继续触发 Smart，而不是 Manual。
  test('在 URL 输入框按 Enter 调用一次 AI 分析', async () => {
    const { analyzeBookmark } = installWailsSpies();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    const urlInput = screen.getByRole('textbox', { name: 'Bookmark URL' });
    await user.type(urlInput, 'https://example.test/enter{Enter}');

    expect(await screen.findByRole('button', { name: 'Save bookmark' })).toBeVisible();
    expect(analyzeBookmark).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
  });

  // TASK-071 / REQ-006-AC-009：关闭并重新打开后，旧 Manual 结果不得覆盖新 URL。
  test('延迟 Manual 元数据在重新打开后返回时保持新输入步骤', async () => {
    let resolveMetadata!: (value: MetadataPayload) => void;
    const fetchMetadata = vi.fn(
      () => new Promise<MetadataPayload>((resolve) => { resolveMetadata = resolve; })
    );
    const analyzeBookmark = vi.fn(async (): Promise<AIResult> => ({
      title: 'Unused',
      description: '',
      summary: '',
      suggestedCategoryId: null,
      suggestedTags: [],
    }));
    (window as TestWindow).go = {
      metadata: { Service: { FetchMetadata: fetchMetadata } },
      ai: { Service: { AnalyzeBookmark: analyzeBookmark } },
    };

    const user = userEvent.setup();
    const onCreate = vi.fn();
    const view = render(dialogElement({ onCreate }));
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/old');
    await user.click(screen.getByRole('button', { name: 'Manual' }));
    expect(fetchMetadata).toHaveBeenCalledOnce();

    view.rerender(dialogElement({ open: false, onCreate }));
    view.rerender(dialogElement({ open: true, initialUrl: 'https://example.test/new', onCreate }));

    await act(async () => {
      resolveMetadata({
        title: 'Stale metadata title',
        description: 'Stale description',
        contentText: 'Stale content',
        faviconUrl: null,
        faviconDataUrl: null,
      });
      await Promise.resolve();
    });

    expect(screen.getByRole('textbox', { name: 'Bookmark URL' })).toHaveValue('https://example.test/new');
    expect(screen.queryByRole('button', { name: 'Save bookmark' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Stale metadata title')).not.toBeInTheDocument();
    expect(analyzeBookmark).not.toHaveBeenCalled();
  });

  // TASK-071 / REQ-006-AC-009：旧 Smart AI 结果同样必须在重开后失效。
  test('延迟 Smart AI 在重新打开后返回时保持新输入步骤', async () => {
    let resolveAI!: (value: AIResult) => void;
    const fetchMetadata = vi.fn(async (): Promise<MetadataPayload> => ({
      title: 'Old metadata title',
      description: 'Old description',
      contentText: 'Old content',
      faviconUrl: null,
      faviconDataUrl: null,
    }));
    const analyzeBookmark = vi.fn(
      () => new Promise<AIResult>((resolve) => { resolveAI = resolve; })
    );
    (window as TestWindow).go = {
      metadata: { Service: { FetchMetadata: fetchMetadata } },
      ai: { Service: { AnalyzeBookmark: analyzeBookmark } },
    };

    const user = userEvent.setup();
    const onCreate = vi.fn();
    const view = render(dialogElement({ onCreate }));
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/old-smart');
    await user.click(screen.getByRole('button', { name: 'Smart' }));
    await waitFor(() => expect(analyzeBookmark).toHaveBeenCalledOnce());

    view.rerender(dialogElement({ open: false, onCreate }));
    view.rerender(dialogElement({ open: true, initialUrl: 'https://example.test/new-smart', onCreate }));

    await act(async () => {
      resolveAI({
        title: 'Stale AI title',
        description: 'Stale AI description',
        summary: 'Stale AI summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    expect(screen.getByRole('textbox', { name: 'Bookmark URL' })).toHaveValue('https://example.test/new-smart');
    expect(screen.queryByRole('button', { name: 'Save bookmark' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Stale AI title')).not.toBeInTheDocument();
  });
});
