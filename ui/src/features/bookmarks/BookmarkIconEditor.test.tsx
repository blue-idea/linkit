import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  initialIconEditorForNewBookmark,
  resolveIconEditorIcon,
  type BookmarkIconEditorValue,
} from './bookmark-icon-editor-model';
import { BookmarkIconEditor } from './BookmarkIconEditor';

vi.mock('../../i18n/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'bookmark.iconBackgroundOption' && params?.name) return params.name;
      const map: Record<string, string> = {
        'bookmark.iconSection': 'Icon',
        'bookmark.iconModeLabel': 'Icon mode',
        'bookmark.iconUseSite': 'Website favicon',
        'bookmark.iconUseText': 'Text icon',
        'bookmark.iconGlyph': 'Icon character',
        'bookmark.iconGlyphHint': 'Leave empty for title initial',
        'bookmark.iconSiteHint': 'Site favicon hint',
        'bookmark.iconBackground': 'Text icon background',
        'bookmark.iconBackgroundLabel': 'Text icon background color',
        'color.coral': 'Coral',
        'color.blue': 'Blue',
      };
      return map[key] ?? key;
    },
    getLocale: () => 'en' as const,
  }),
}));

describe('BookmarkIconEditor', () => {
  it('网站 favicon 模式下可切换到文字图标并显示背景色选项', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: BookmarkIconEditorValue = {
      mode: 'site',
      siteFaviconUrl: 'https://example.test/f.ico',
      siteFaviconPreview: 'https://example.test/f.ico',
      glyphOverride: '',
      faviconColor: 'blue',
    };
    render(
      <BookmarkIconEditor
        url="https://example.test"
        title="Example"
        value={value}
        onChange={onChange}
      />
    );
    expect(screen.queryByRole('button', { name: 'Coral' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Text icon' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'text' }));
  });

  it('文字模式 resolveIconEditorIcon 使用自定义 glyph', () => {
    const icon = resolveIconEditorIcon({
      url: 'https://bilibili.com',
      title: 'Bilibili',
      value: {
        mode: 'text',
        siteFaviconUrl: 'https://bilibili.com/f.ico',
        siteFaviconPreview: null,
        glyphOverride: '哔',
        faviconColor: 'amber',
      },
    });
    expect(icon).toEqual({ favicon: '哔', faviconColor: 'amber' });
  });

  it('initialIconEditorForNewBookmark 有 faviconUrl 时默认网站图标', () => {
    const value = initialIconEditorForNewBookmark({
      url: 'https://example.test',
      faviconUrl: 'https://example.test/f.ico',
      faviconDataUrl: null,
    });
    expect(value.mode).toBe('site');
    expect(value.siteFaviconUrl).toBe('https://example.test/f.ico');
  });

  it('initialIconEditorForNewBookmark 无任何图标时默认文字图标', () => {
    const value = initialIconEditorForNewBookmark({
      url: 'https://example.test',
      faviconUrl: null,
      faviconDataUrl: null,
    });
    expect(value.mode).toBe('text');
  });
});
