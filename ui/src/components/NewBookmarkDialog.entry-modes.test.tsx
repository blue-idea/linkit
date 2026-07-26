import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { NewBookmarkDialog } from './Dialogs';
import type { Category, Tag } from '../types';

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
  categories?: Category[];
  tags?: Tag[];
  onCreate: ReturnType<typeof vi.fn>;
  onCreateTag?: ReturnType<typeof vi.fn>;
}) {
  return (
    <NewBookmarkDialog
      open={input.open ?? true}
      initialUrl={input.initialUrl ?? ''}
      bookmarks={input.bookmarks ?? []}
      categories={input.categories ?? []}
      tags={input.tags ?? []}
      collections={[]}
      aiContext={{ apiBase: 'https://api.example.test/v1', model: 'test-model', locale: 'en' }}
      onClose={() => undefined}
      onCreate={input.onCreate}
      onCreateTag={input.onCreateTag}
    />
  );
}

function renderDialog() {
  const onCreate = vi.fn();
  render(dialogElement({ onCreate }));
  return { onCreate };
}

function installWailsSpies(
  metadata?: Partial<MetadataPayload>,
  analyze: () => Promise<AIResult> = async () => ({
    title: 'AI title',
    description: 'AI description',
    summary: 'AI summary',
    suggestedCategoryId: null,
    suggestedTags: [],
  })
) {
  const fetchMetadata = vi.fn(async (): Promise<MetadataPayload> => ({
    title: 'Metadata title',
    description: 'Metadata description',
    contentText: 'Metadata content',
    faviconUrl: null,
    faviconDataUrl: null,
    ...metadata,
  }));
  const analyzeBookmark = vi.fn(analyze);
  (window as TestWindow).go = {
    metadata: { Service: { FetchMetadata: fetchMetadata } },
    ai: { Service: { AnalyzeBookmark: analyzeBookmark } },
  };
  return { fetchMetadata, analyzeBookmark };
}

function installDeferredAI(metadata?: Partial<MetadataPayload>) {
  let resolver: ((value: AIResult) => void) | null = null;
  const fetchMetadata = vi.fn(async (): Promise<MetadataPayload> => ({
    title: 'Metadata title',
    description: 'Metadata description',
    contentText: 'Metadata content',
    faviconUrl: null,
    faviconDataUrl: null,
    ...metadata,
  }));
  const analyzeBookmark = vi.fn(
    () => new Promise<AIResult>((resolve) => { resolver = resolve; })
  );
  (window as TestWindow).go = {
    metadata: { Service: { FetchMetadata: fetchMetadata } },
    ai: { Service: { AnalyzeBookmark: analyzeBookmark } },
  };
  return {
    fetchMetadata,
    analyzeBookmark,
    resolveAI(value: AIResult) {
      if (!resolver) throw new Error('AI analysis has not started');
      resolver(value);
    },
  };
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

  test('标签加号创建标签后立即选中并在保存时写入新标签 ID', async () => {
    const { fetchMetadata } = installWailsSpies();
    const onCreateTag = vi.fn();
    onCreateTag.mockReturnValue({ id: 'tag-new', label: 'Reading', color: 'green' });
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(dialogElement({ onCreate, onCreateTag }));

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/tag-plus');
    await user.click(screen.getByRole('button', { name: 'Manual' }));
    await screen.findByRole('button', { name: 'Save bookmark' });

    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    expect(screen.getByRole('dialog', { name: 'New tag' })).toBeVisible();
    await user.type(screen.getByPlaceholderText('Enter tag name…'), 'Reading');
    await user.click(screen.getByRole('button', { name: 'Color green' }));
    await user.click(screen.getByRole('button', { name: 'New tag' }));

    expect(onCreateTag).toHaveBeenCalledWith({ label: 'Reading', color: 'green' });
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMetadata).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Save bookmark' }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['tag-new'] }));
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

    expect(await screen.findByRole('button', { name: 'Save with AI' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save now' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('AI title');
    expect(fetchMetadata).toHaveBeenCalledOnce();
    expect(analyzeBookmark).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
  });

  // REQ-006-AC-011：元数据是 Smart 的快速路径；AI 尚未返回时也必须允许检查与保存。
  test('Smart 在 AI 延迟时先显示元数据预览并允许保存', async () => {
    const { analyzeBookmark, resolveAI } = installDeferredAI({
      title: 'Fast metadata title',
      description: 'Fast metadata description',
      contentText: 'Fast metadata content',
    });

    const user = userEvent.setup();
    const { onCreate } = renderDialog();
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/fast');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const saveNowButton = await screen.findByRole('button', { name: 'Save now' });
    const saveWithAIButton = screen.getByRole('button', { name: 'Save with AI' });
    expect(saveNowButton).toBeEnabled();
    expect(saveWithAIButton).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Fast metadata title');
    expect(screen.getByRole('status', { name: 'AI enhancement in progress' })).toBeVisible();
    expect(analyzeBookmark).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();

    await act(async () => {
      resolveAI({
        title: 'Enhanced AI title',
        description: 'Enhanced AI description',
        summary: 'Enhanced AI summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Enhanced AI title');
    });
    expect(saveWithAIButton).toBeEnabled();
    expect(screen.queryByRole('status', { name: 'AI enhancement in progress' })).not.toBeInTheDocument();
  });

  test('Smart 使用 AI 结果保存需等待增强完成', async () => {
    const { resolveAI } = installDeferredAI();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/save-with-ai');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const saveWithAIButton = await screen.findByRole('button', { name: 'Save with AI' });
    expect(saveWithAIButton).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();

    await act(async () => {
      resolveAI({
        title: 'AI completed title',
        description: 'AI completed description',
        summary: 'AI completed summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(saveWithAIButton).toBeEnabled());
    await user.click(saveWithAIButton);

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AI completed title',
      description: 'AI completed description',
      aiSummary: 'AI completed summary',
    }));
  });

  test('Smart AI 失败后仅允许立即保存元数据', async () => {
    installWailsSpies(undefined, async () => {
      throw { code: 'AI_TIMEOUT', message: 'AI request timed out' };
    });
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/ai-error');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const saveNowButton = await screen.findByRole('button', { name: 'Save now' });
    const saveWithAIButton = screen.getByRole('button', { name: 'Save with AI' });
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(saveNowButton).toBeEnabled();
    expect(saveWithAIButton).toBeDisabled();

    await user.click(saveNowButton);

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Metadata title',
      description: 'Metadata description',
      aiSummary: '',
    }));
  });

  // REQ-006-AC-011：后台增强不得覆盖用户在元数据预览中的编辑。
  test('Smart 后台 AI 不覆盖用户已编辑的元数据字段', async () => {
    const { resolveAI } = installDeferredAI();

    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/edit');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const titleInput = await screen.findByRole('textbox', { name: 'Bookmark title' });
    await user.clear(titleInput);
    await user.type(titleInput, 'User title');

    await act(async () => {
      resolveAI({
        title: 'AI title must not overwrite',
        description: 'AI description',
        summary: 'AI summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('User title'));
    expect(screen.getByRole('textbox', { name: 'AI summary' })).toHaveValue('AI summary');
  });

  // REQ-006-AC-011：即使用户将字段改回元数据原值，也应视为已编辑并保留。
  test('Smart 后台 AI 不覆盖改回原值的标题', async () => {
    const { resolveAI } = installDeferredAI();

    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/same-value');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const titleInput = await screen.findByRole('textbox', { name: 'Bookmark title' });
    await user.clear(titleInput);
    await user.type(titleInput, 'Metadata title');

    await act(async () => {
      resolveAI({
        title: 'AI title must not overwrite',
        description: 'AI description',
        summary: 'AI summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    expect(screen.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Metadata title');
  });

  // REQ-006-AC-011：用户改动标签字段后，后台 AI 不得追加新的建议标签。
  test('Smart 后台 AI 不追加用户已编辑的标签字段', async () => {
    const { resolveAI } = installDeferredAI();
    const tags: Tag[] = [
      { id: 'user-tag', label: 'User tag', color: 'blue' },
      { id: 'ai-tag', label: 'AI tag', color: 'green' },
    ];

    const user = userEvent.setup();
    render(dialogElement({ onCreate: vi.fn(), tags }));
    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/tag-edit');
    await user.click(screen.getByRole('button', { name: 'Smart' }));

    await screen.findByRole('button', { name: 'Save now' });
    await user.click(screen.getByRole('button', { name: 'User tag' }));

    await act(async () => {
      resolveAI({
        title: 'AI title',
        description: 'AI description',
        summary: 'AI summary',
        suggestedCategoryId: null,
        suggestedTags: ['AI tag'],
      });
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'User tag' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'AI tag' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('Smart 可在 AI 返回前保存元数据且忽略过期增强结果', async () => {
    const { resolveAI } = installDeferredAI();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(screen.getByRole('textbox', { name: 'Bookmark URL' }), 'https://example.test/save-fast');
    await user.click(screen.getByRole('button', { name: 'Smart' }));
    await user.click(await screen.findByRole('button', { name: 'Save now' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Metadata title',
      description: 'Metadata description',
      aiSummary: '',
    }));

    await act(async () => {
      resolveAI({
        title: 'Late AI title',
        description: 'Late AI description',
        summary: 'Late AI summary',
        suggestedCategoryId: null,
        suggestedTags: [],
      });
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledOnce();
    expect(screen.queryByDisplayValue('Late AI title')).not.toBeInTheDocument();
  });

  // TASK-071 / REQ-006-AC-009：URL 输入框 Enter 继续触发 Smart，而不是 Manual。
  test('在 URL 输入框按 Enter 调用一次 AI 分析', async () => {
    const { analyzeBookmark } = installWailsSpies();
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    const urlInput = screen.getByRole('textbox', { name: 'Bookmark URL' });
    await user.type(urlInput, 'https://example.test/enter{Enter}');

    expect(await screen.findByRole('button', { name: 'Save with AI' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save now' })).toBeEnabled();
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
    expect(screen.queryByRole('button', { name: 'Save now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save with AI' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Save now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save with AI' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Stale AI title')).not.toBeInTheDocument();
  });
});
