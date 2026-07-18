/**
 * 打开外部 HTTP(S) URL。
 * 桌面端优先调用 Go platform.OpenExternalURL；浏览器环境回退 window.open。
 * 失败必须抛错，以便调用方拒绝增加 visitCount。
 * REQ-008-AC-002
 */
export async function openExternalUrl(url: string): Promise<void> {
  const goOpen = (
    window as unknown as {
      go?: { platform?: { Service?: { OpenExternalURL?: (raw: string) => Promise<void> } } };
    }
  ).go?.platform?.Service?.OpenExternalURL;

  if (typeof goOpen === 'function') {
    await goOpen(url);
    return;
  }

  const handle = window.open(url, '_blank', 'noopener,noreferrer');
  if (!handle) {
    throw new Error('Failed to open external URL');
  }
}
