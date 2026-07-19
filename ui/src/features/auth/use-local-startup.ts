import type { AppSettings as DomainSettings } from '../../domain/library';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings as UiSettings, ThemeId } from '../../types';
import { getDefaultAppSettings, prepareSettingsForPersist } from '../../services/settings';
import { bootstrapApp, createPreferredStorageAdapters, type BootstrapPhase } from '../../services/storage';
import { loadSettings as loadLegacySettings } from '../../storage';
import { applyTheme } from '../../themes';
import { resolveStartupView, type StartupView } from './startup-gate';

function toUiSettings(domain: DomainSettings, legacy: UiSettings): UiSettings {
  return {
    storageMode: domain.storageMode,
    theme: (domain.theme as ThemeId) || legacy.theme,
    locale: domain.locale === 'zh' || domain.locale === 'en' ? domain.locale : legacy.locale ?? 'en',
    // 优先本机设置文档中的 AI 配置，legacy 仅作迁移回退。
    ai: {
      apiBase: domain.ai.apiBase || legacy.ai.apiBase,
      model: domain.ai.model || legacy.ai.model,
    },
    aiConsent: domain.aiConsent,
  };
}

function toDomainSettings(settings: UiSettings): DomainSettings {
  const defaults = getDefaultAppSettings();
  return prepareSettingsForPersist({
    ...defaults,
    storageMode: settings.storageMode,
    theme: settings.theme,
    locale: settings.locale ?? 'en',
    ai: {
      apiBase: settings.ai.apiBase || '',
      model: settings.ai.model || '',
    },
    aiConsent: settings.aiConsent ?? null,
  });
}

export async function persistUiSettings(settings: UiSettings): Promise<void> {
  const { saveSettings } = await import('../../storage');
  saveSettings(settings);
  const adapters = createPreferredStorageAdapters();
  await adapters.saveSettings(toDomainSettings(settings));
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

        const nextSettings = toUiSettings(result.settings, legacy);
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
