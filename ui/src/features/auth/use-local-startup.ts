import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings as UiSettings } from '../../types';
import { toDomainAppSettings, toUiAppSettings } from '../../services/settings';
import { bootstrapApp, createPreferredStorageAdapters, type BootstrapPhase } from '../../services/storage';
import { loadSettings as loadLegacySettings, saveSettings } from '../../storage';
import { applyTheme } from '../../themes';
import { resolveStartupView, type StartupView } from './startup-gate';

export async function persistUiSettings(settings: UiSettings): Promise<void> {
  saveSettings(settings);
  const adapters = createPreferredStorageAdapters();
  await adapters.saveSettings(toDomainAppSettings(settings));
}

/**
 * 启动时并行完成设置引导，并决定是否自动进入本地模式。
 */
export function useLocalStartup(authLoading: boolean) {
  const adapters = useMemo(() => createPreferredStorageAdapters(), []);
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

        const nextSettings = toUiAppSettings(result.settings, legacy);
        setSettings(nextSettings);
        applyTheme(nextSettings.theme);
        document.documentElement.lang = nextSettings.locale ?? 'en';
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
    markAuthenticated: useCallback(() => setSessionMode('authenticated'), []),
  };
}
