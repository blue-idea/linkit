import {
  deleteAIKey as deleteBrowserAIKey,
  getAIKeyStatus as getBrowserAIKeyStatus,
  setAIKey as setBrowserAIKey,
  type SecretStatus,
} from './browser-secret-store';

type SetSecretRequest = { value: string };

type GoSecretService = {
  SetAIKey?: (request: SetSecretRequest) => Promise<void>;
  DeleteAIKey?: () => Promise<void>;
  GetAIKeyStatus?: () => Promise<SecretStatus>;
};

function getGoSecretService(): GoSecretService | null {
  const service = (window as unknown as { go?: { secretstore?: { Service?: GoSecretService } } }).go
    ?.secretstore?.Service;
  return service ?? null;
}

/**
 * 桌面优先 SecretStore：有 Wails 绑定时写入 OS Keychain，否则回退浏览器会话替身。
 * REQ-019-AC-001 / REQ-025-AC-002
 */
export async function getPreferredAIKeyStatus(): Promise<SecretStatus> {
  const go = getGoSecretService()?.GetAIKeyStatus;
  if (typeof go === 'function') {
    return go();
  }
  return getBrowserAIKeyStatus();
}

export async function setPreferredAIKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Secret value must not be empty');
  }
  const go = getGoSecretService()?.SetAIKey;
  if (typeof go === 'function') {
    // Go 期望 SetSecretRequest 结构体，不可直接传字符串。
    await go({ value: trimmed });
    return;
  }
  await setBrowserAIKey(trimmed);
}

export async function deletePreferredAIKey(): Promise<void> {
  const go = getGoSecretService()?.DeleteAIKey;
  if (typeof go === 'function') {
    await go();
    return;
  }
  await deleteBrowserAIKey();
}

export type { SecretStatus };
