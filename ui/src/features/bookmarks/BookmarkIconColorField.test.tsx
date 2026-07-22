import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BookmarkIconColorField } from './BookmarkIconColorField';

vi.mock('../../i18n/use-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'bookmark.iconBackgroundOption' && params?.name) return params.name;
      const map: Record<string, string> = {
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

describe('BookmarkIconColorField', () => {
  it('选择颜色时 shall 触发 onColorChange', async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn();
    render(<BookmarkIconColorField glyph="L" color="blue" onColorChange={onColorChange} />);
    await user.click(screen.getByRole('button', { name: 'Coral' }));
    expect(onColorChange).toHaveBeenCalledWith('coral');
  });
});
