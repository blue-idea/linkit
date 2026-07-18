import type { AppSettings, LibraryEnvelope } from '../../domain/library';
import type { RepositoryLoadResult } from '../../repositories';

export type BootstrapPhase = 'ready' | 'recovery_required';

export interface SettingsLoadResult {
  state: 'found' | 'default';
  settings: AppSettings;
}

export interface BootstrapDependencies {
  loadSettings: () => Promise<SettingsLoadResult>;
  loadLibrary: () => Promise<RepositoryLoadResult>;
}

export interface BootstrapResult {
  phase: BootstrapPhase;
  settings: AppSettings;
  library: LibraryEnvelope | null;
  recovery: { source: 'local' | 'cloud'; envelope: LibraryEnvelope } | null;
  /** storageMode 为 local 时启动后应直接进入本地主界面。 */
  shouldEnterLocalMode: boolean;
}

/**
 * 并行加载本机设置与资料库，形成启动门控所需的单一结果。
 * REQ-001-AC-005 / REQ-002-AC-002
 */
export async function bootstrapApp(dependencies: BootstrapDependencies): Promise<BootstrapResult> {
  const [settingsResult, libraryResult] = await Promise.all([
    dependencies.loadSettings(),
    dependencies.loadLibrary(),
  ]);

  // 仅在已持久化的设置中明确为 local 时自动进入，避免默认设置跳过登录门。
  const shouldEnterLocalMode =
    settingsResult.state === 'found' && settingsResult.settings.storageMode === 'local';

  if (libraryResult.state === 'recovery_available') {
    return {
      phase: 'recovery_required',
      settings: settingsResult.settings,
      library: null,
      recovery: libraryResult.recovery,
      shouldEnterLocalMode,
    };
  }

  if (libraryResult.state === 'found') {
    return {
      phase: 'ready',
      settings: settingsResult.settings,
      library: libraryResult.snapshot.envelope,
      recovery: null,
      shouldEnterLocalMode,
    };
  }

  return {
    phase: 'ready',
    settings: settingsResult.settings,
    library: null,
    recovery: null,
    shouldEnterLocalMode,
  };
}
