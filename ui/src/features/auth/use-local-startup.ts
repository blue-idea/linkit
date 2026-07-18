import { useEffect, useMemo, useState } from 'react';
import type { AppSettings as UiSettings, ThemeId } from '../../types';
import { getDefaultAppSettings } from '../../services/settings';
import { bootstrapApp, createBrowserStorageAdapters, type BootstrapPhase } from '../../services/storage';
import { loadSettings as loadLegacySettings } from '../../storage';
import { applyTheme } from '../../themes';
import { resolveStartupView, type StartupView } from './startup-gate';

function toUiSettings(domainStorageMode: 'local' | 'cloud', domainTheme: string, legacy: UiSettings): UiSettings {
  return {
    storageMode: domainStorageMode,
    theme: (domainTheme as ThemeId) || legacy.theme,
    ai: {
      apiBase: legacy.ai.apiBase,
      model: legacy.ai.model,
      apiKey: legacy.ai.apiKey,
    },
  };
}

export async function persistUiSettings(settings: UiSettings): Promise<void> {
  const { saveSettings } = await import('../../storage');
  saveSettings(settings);
  const adapters = createBrowserStorageAdapters();
  await adapters.saveSettings({
    ...getDefaultAppSettings(),
    storageMode: settings.storageMode,
    theme: settings.theme,
    ai: {
      apiBase: settings.ai.apiBase || '',
      model: settings.ai.model || '',
    },
  });
}

/**
 * 启动时并行完成设置引导，并决定是否自动进入本地模式。
 */
export function useLocalStartup(authLoading: boolean) {
  const adapters = useMemo(() => createBrowserStorageAdapters(), []);
  const [bootstrapPhase, setBootstrapPhase] = useState<BootstrapPhase | null>(null);
  const [settings, setSettings] = useState<UiSettings | null>(null);
  const [sessionMode, setSessionMode] = useState<'signed_out' | 'local' | 'authenticated'>('signed_out');
  const [recoveryPending, setRecoveryPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const legacy = loadLegacySettings();
        const result = await bootstrapApp({
          loadSettings: adapters.loadSettings,
          loadLibrary: adapters.loadLibrary,
        });
        if (cancelled) return;

        const nextSettings = toUiSettings(result.settings.storageMode, result.settings.theme, legacy);
        setSettings(nextSettings);
        applyTheme(nextSettings.theme);
        setRecoveryPending(result.phase === 'recovery_required');
        if (result.shouldEnterLocalMode && result.phase === 'ready') {
          setSessionMode('local');
        }
        setBootstrapPhase(result.phase);
      } catch {
        if (cancelled) return;
        // 引导失败时仍释放启动门，避免黑屏；回退登录界面。
        setSettings(loadLegacySettings());
        setBootstrapPhase('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adapters]);

  const view: StartupView = resolveStartupView({
    authLoading,
    bootstrapPhase,
    sessionMode,
    recoveryPending,
  });

  return {
    view,
    settings,
    setSettings,
    sessionMode,
    setSessionMode,
    recoveryPending,
    setRecoveryPending,
    enterLocalMode: async (current: UiSettings) => {
      const next = { ...current, storageMode: 'local' as const };
      setSettings(next);
      await persistUiSettings(next);
      setSessionMode('local');
      setRecoveryPending(false);
    },
    markSignedOut: () => {
      // REQ-002-AC-003：退出登录只清会话，不清除本机资料库。
      setSessionMode('signed_out');
    },
    markAuthenticated: () => setSessionMode('authenticated'),
  };
}
