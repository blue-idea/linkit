import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AboutDialog } from './AboutDialog';

const openExternalUrl = vi.fn();

vi.mock('../bookmarks/external-url', () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}));

describe('AboutDialog', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    openExternalUrl.mockReset();
  });

  test('展示版本与 GitHub 主页', () => {
    render(
      <AboutDialog
        open
        onClose={() => undefined}
        appVersion="0.2.9"
        githubUrl="https://github.com/blue-idea/linkit"
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    expect(within(dialog).getByText(/version\s*0\.2\.9/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /github\.com\/blue-idea\/linkit/i })).toBeInTheDocument();
  });

  test('点击 GitHub 链接时通过外部打开', async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog
        open
        onClose={() => undefined}
        githubUrl="https://github.com/blue-idea/linkit"
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    await user.click(within(dialog).getByRole('link', { name: /github\.com\/blue-idea\/linkit/i }));
    expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/blue-idea/linkit');
  });
});
