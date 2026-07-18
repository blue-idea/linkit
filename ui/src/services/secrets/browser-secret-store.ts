/** 浏览器环境下的 SecretStore 替身：仅保留 configured 状态，不把 Key 写入 localStorage。 */
let sessionAIKey: string | null = null;

export interface SecretStatus {
  configured: boolean;
}

export async function getAIKeyStatus(): Promise<SecretStatus> {
  return { configured: Boolean(sessionAIKey) };
}

export async function setAIKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Secret value must not be empty');
  }
  sessionAIKey = trimmed;
}

export async function deleteAIKey(): Promise<void> {
  sessionAIKey = null;
}

/** 测试辅助：重置会话密钥。 */
export function resetBrowserSecretStoreForTests(): void {
  sessionAIKey = null;
}
