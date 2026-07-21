import { useEffect, useRef, useState } from 'react';
import type { AppSettings, LibraryData, StorageMode, ThemeId, UiLocale } from '../types';
import { themes, applyTheme } from '../themes';
import { Icon, Button, AIBadge } from './ui';
import { exportLibrary, importLibrary } from '../storage';
import { getSettingsSections } from '../i18n';
import { useI18n } from '../i18n/use-i18n';
import type { SettingsSectionKey } from '../config/i18n';
import { resolveThemeLabel, ShortcutsPanel } from '../features/settings';
import {
  applyConfirmedImport,
  buildExportEnvelopeFromUi,
  localizeImportError,
  parseImportText,
  summarizeImport,
  type ImportSummary,
  ImportOverwriteDialog,
} from '../features/import-export';
import {
  StorageSwitchDialog,
} from '../features/storage';
import { AIConsentDialog, buildConsentRecord, requiresAIConsent } from '../features/settings';
import type { LibraryEnvelope } from '../domain/library';
import type { StorageSummary } from '../repositories';
import {
  deletePreferredAIKey,
  getPreferredAIKeyStatus,
  setPreferredAIKey,
} from '../services/secrets';
import {
  createDataRootBindings,
  type DataRootInfo,
} from '../services/storage/data-root';
import { getDefaultAppSettings, normalizeApiBase } from '../services/settings';

const dataRootBindings = createDataRootBindings();

type Tab = SettingsSectionKey;

/** 从 Wails/JS 错误对象中提取稳定错误码。 */
function extractErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string') {
      if (error.includes('DATA_ROOT_TARGET_OCCUPIED')) return 'DATA_ROOT_TARGET_OCCUPIED';
      if (error.includes('DATA_ROOT_MIGRATE_FAILED')) return 'DATA_ROOT_MIGRATE_FAILED';
      if (error.includes('DATA_ROOT_INVALID')) return 'DATA_ROOT_INVALID';
      if (error.includes('DATA_ROOT_EMPTY') || error.includes('No library or settings')) return 'DATA_ROOT_EMPTY';
    }
    return undefined;
  }
  const record = error as { code?: string; message?: string };
  if (record.code) {
    return record.code;
  }
  if (typeof record.message === 'string') {
    if (record.message.includes('already contains Linkit data')) return 'DATA_ROOT_TARGET_OCCUPIED';
    if (record.message.includes('Failed to migrate')) return 'DATA_ROOT_MIGRATE_FAILED';
  }
  return undefined;
}

function Modal({
  open,
  onClose,
  children,
  width = 'max-w-[640px]',
  'aria-label': ariaLabel = 'Settings',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  'aria-label'?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative w-full ${width} rounded-mac-xl glass-strong ring-glow overflow-hidden animate-scale-in max-h-[88vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
  hint,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-ink-800/60 hairline flex items-center justify-center shrink-0">
          <Icon name={icon} size={15} className="text-ink-300" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-ink-100">{label}</div>
          {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StorageRadio({
  mode,
  current,
  onSelect,
  label,
  icon,
  hint,
}: {
  mode: StorageMode;
  current: StorageMode;
  onSelect: (m: StorageMode) => void;
  label: string;
  icon: string;
  hint: string;
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`flex-1 rounded-mac-lg p-4 text-left transition hairline ${
        active ? 'bg-accent-500/15 ring-1 ring-accent-400/40' : 'bg-ink-800/50 hover:bg-ink-700/60'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            active ? 'bg-accent-500/20' : 'bg-ink-700/60'
          }`}
        >
          <Icon name={icon} size={15} className={active ? 'text-accent-300' : 'text-ink-300'} />
        </span>
        <span className="text-[13px] font-semibold text-ink-100">{label}</span>
        {active && <Icon name="Check" size={14} className="text-accent-300 ml-auto" />}
      </div>
      <p className="text-[11px] text-ink-400 leading-relaxed">{hint}</p>
    </button>
  );
}

const TAB_ICONS: Record<Tab, string> = {
  general: 'User',
  storage: 'Database',
  ai: 'Sparkles',
  appearance: 'Palette',
  language: 'Languages',
  shortcuts: 'Key',
};

/**
 * Settings 对话框：General / Storage / AI / Appearance / Language / Shortcuts。
 * 覆盖 REQ-023-AC-001~005、REQ-030-AC-006~009。
 */
export function SettingsDialog({
  open,
  settings,
  user,
  library,
  cloudSummary = null,
  onClose,
  onSave,
  onImport,
  onSignOut,
  onRestoreSampleData,
  onStorageSwitchConfirm,
}: {
  open: boolean;
  settings: AppSettings;
  user: { id: string; email: string | null } | null;
  library: LibraryData;
  /** 目标端（云）摘要；未知时按 empty 展示。 */
  cloudSummary?: StorageSummary | null;
  onClose: () => void;
  onSave: (s: AppSettings) => void | Promise<void>;
  onImport: (lib: LibraryData) => void;
  onSignOut: () => void;
  onRestoreSampleData?: () => void;
  /** 用户确认 Use Target / Overwrite Target 时回调；Cancel 不调用。 */
  onStorageSwitchConfirm?: (
    choice: 'use_target' | 'overwrite_target',
    targetMode: StorageMode
  ) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingEnvelope, setPendingEnvelope] = useState<LibraryEnvelope | null>(null);
  const [pendingSummary, setPendingSummary] = useState<ImportSummary | null>(null);
  const [pendingSwitchMode, setPendingSwitchMode] = useState<StorageMode | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [dataRootInfo, setDataRootInfo] = useState<DataRootInfo | null>(null);
  const [pendingDataRootTarget, setPendingDataRootTarget] = useState<string | null>(null);
  const [dataRootMessage, setDataRootMessage] = useState<string | null>(null);
  const [dataRootError, setDataRootError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const i18n = useI18n(draft.locale ?? 'en');

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setImportMsg(null);
      setImportError(null);
      setPendingEnvelope(null);
      setPendingSummary(null);
      setPendingSwitchMode(null);
      setKeyDraft('');
      setConsentOpen(false);
      setPendingDataRootTarget(null);
      setDataRootMessage(null);
      setDataRootError(null);
      void getPreferredAIKeyStatus().then((status) => setKeyConfigured(status.configured));
      void dataRootBindings.getDataRoot().then(setDataRootInfo).catch(() => setDataRootInfo(null));
    }
  }, [open, settings]);

  const update = (patch: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const updateAI = (patch: Partial<AppSettings['ai']>) =>
    setDraft((d) => {
      const ai = { ...d.ai, ...patch };
      // API Base 变化后清除不匹配的 consent，避免误以为已授权。
      const consent =
        d.aiConsent && normalizeApiBase(d.aiConsent.apiBase) === normalizeApiBase(ai.apiBase)
          ? d.aiConsent
          : null;
      return { ...d, ai, aiConsent: consent };
    });

  const requestStorageMode = (mode: StorageMode) => {
    // 与已持久化模式相同：直接改草稿；不同则先确认（REQ-004-AC-001）。
    if (mode === settings.storageMode) {
      update({ storageMode: mode });
      return;
    }
    setPendingSwitchMode(mode);
  };

  const requestChangeDataRoot = async () => {
    // REQ-029-AC-001：先选目录并展示确认摘要，确认前不写盘。
    setDataRootError(null);
    setDataRootMessage(null);
    const selected = await dataRootBindings.selectDataRootDirectory();
    if (selected.state !== 'selected' || !selected.path) {
      return;
    }
    setPendingDataRootTarget(selected.path);
  };

  const confirmChangeDataRoot = async () => {
    if (!pendingDataRootTarget || !dataRootInfo) {
      return;
    }
    setDataRootError(null);
    try {
      // 将当前 UI 中的资料库与设置一并提交，确保源 AppData 为空时也能真实落盘迁移。
      const exportDoc = buildExportEnvelopeFromUi(library, { now: new Date().toISOString() });
      const libraryDocument = {
        format: exportDoc.format,
        schemaVersion: exportDoc.schemaVersion,
        revision: exportDoc.revision,
        updatedAt: exportDoc.updatedAt,
        data: exportDoc.data,
      };
      const defaults = getDefaultAppSettings();
      const settingsDocument = {
        ...defaults,
        storageMode: draft.storageMode,
        theme: draft.theme,
        locale: draft.locale ?? defaults.locale,
        ai: {
          apiBase: draft.ai?.apiBase ?? '',
          model: draft.ai?.model ?? '',
        },
      };
      const result = await dataRootBindings.migrateDataRoot({
        targetPath: pendingDataRootTarget,
        confirmed: true,
        libraryDocumentJson: JSON.stringify(libraryDocument),
        settingsJson: JSON.stringify(settingsDocument),
      });
      setDataRootInfo({
        ...dataRootInfo,
        dataRoot: result.dataRoot,
        isCustom: result.dataRoot !== dataRootInfo.bootstrapRoot,
      });
      setPendingDataRootTarget(null);
      setDataRootMessage(i18n.t('settings.storage.migrationSuccess'));
    } catch (error) {
      const code = extractErrorCode(error);
      const message = error instanceof Error ? error.message : '';
      if (code === 'DATA_ROOT_TARGET_OCCUPIED' || message.includes('already contains Linkit data')) {
        setDataRootError(i18n.t('settings.storage.migrationOccupied'));
      } else if (code === 'DATA_ROOT_EMPTY' || message.includes('No library or settings')) {
        setDataRootError('No library or settings data available to migrate');
      } else if (message) {
        setDataRootError(message);
      } else {
        setDataRootError(i18n.t('settings.storage.migrationFailed'));
      }
      setPendingDataRootTarget(null);
    }
  };

  const localSummary: StorageSummary = {
    exists: library.bookmarks.length > 0,
    revision: null,
    updatedAt: null,
    bookmarkCount: library.bookmarks.length,
    byteSize: 0,
  };
  const switchSourceMode = settings.storageMode;
  const switchTargetMode = pendingSwitchMode ?? 'cloud';
  const switchSourceSummary = switchSourceMode === 'local' ? localSummary : (cloudSummary ?? {
    exists: false, revision: null, updatedAt: null, bookmarkCount: null, byteSize: 0,
  });
  const switchTargetSummary = switchTargetMode === 'cloud' ? (cloudSummary ?? {
    exists: false, revision: null, updatedAt: null, bookmarkCount: null, byteSize: 0,
  }) : localSummary;

  const handleExport = () => {
    const doc = buildExportEnvelopeFromUi(library, { now: new Date().toISOString() });
    exportLibrary(doc, 'linkit-export.json');
  };

  const handleImportFile = async (file: File) => {
    setImportMsg(null);
    setImportError(null);
    try {
      const raw = await importLibrary(file);
      const parsed = parseImportText(raw, new Date().toISOString());
      if (!parsed.success) {
        const localized = localizeImportError(parsed.error.key, draft.locale ?? 'en');
        setImportError(localized.message);
        return;
      }
      setPendingEnvelope(parsed.envelope);
      setPendingSummary(summarizeImport(parsed.envelope));
    } catch {
      const localized = localizeImportError('IMPORT_INVALID', draft.locale ?? 'en');
      setImportError(localized.message);
    }
  };

  const handleConfirmImport = () => {
    if (!pendingEnvelope) return;
    const applied = applyConfirmedImport(pendingEnvelope, true);
    if (!applied) return;
    onImport(applied);
    setImportMsg(
      i18n.t('import.success', { count: pendingEnvelope.data.bookmarks.length })
    );
    setPendingEnvelope(null);
    setPendingSummary(null);
  };

  const sections = getSettingsSections(i18n).map((s) => ({
    ...s,
    icon: TAB_ICONS[s.id],
  }));

  const themeDescKey = (id: ThemeId) => `theme.${id}.desc` as const;

  return (
    <Modal open={open} onClose={onClose} aria-label={i18n.t('settings.title')}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
        <Icon name="Settings" size={18} className="text-ink-200" />
        <span className="text-[15px] font-semibold text-ink-100">{i18n.t('settings.title')}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-8 h-8 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition"
        >
          <Icon name="X" size={16} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-44 shrink-0 border-r border-white/5 p-2 space-y-0.5" role="tablist" aria-label={i18n.t('settings.sectionsLabel')}>
          {sections.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition ${
                tab === t.id
                  ? 'bg-accent-500/20 text-ink-100'
                  : 'text-ink-300 hover:bg-ink-700/50 hover:text-ink-100'
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin p-5">
          {tab === 'general' && (
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                {i18n.t('settings.general.account')}
              </div>
              <Row
                icon="Mail"
                label={user?.email ?? i18n.t('settings.general.signedOut')}
                hint={user ? i18n.t('settings.general.signedIn') : i18n.t('settings.general.localMode')}
              >
                {user ? (
                  <Button size="sm" variant="danger" icon="LogOut" onClick={onSignOut}>
                    {i18n.t('settings.general.signOut')}
                  </Button>
                ) : (
                  <Button size="sm" variant="subtle" icon="LogOut" onClick={onSignOut}>
                    {i18n.t('settings.general.backToLogin')}
                  </Button>
                )}
              </Row>
              <div className="h-px bg-white/5 my-2" />
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                {i18n.t('settings.general.data')}
              </div>
              <Row icon="Download" label={i18n.t('settings.general.export')} hint={i18n.t('settings.general.exportHint')}>
                <Button size="sm" variant="subtle" icon="Download" onClick={handleExport}>
                  {i18n.t('export.button')}
                </Button>
              </Row>
              <Row
                icon="Upload"
                label={i18n.t('settings.general.import')}
                hint={i18n.t('settings.general.importHint')}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  data-testid="import-file-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImportFile(f);
                    e.target.value = '';
                  }}
                />
                <Button size="sm" variant="subtle" icon="Upload" onClick={() => fileRef.current?.click()}>
                  {i18n.t('import.button')}
                </Button>
              </Row>
              {onRestoreSampleData && (
                <Row
                  icon="RefreshCw"
                  label={i18n.t('settings.general.restoreSample')}
                  hint={i18n.t('settings.general.restoreSampleHint')}
                >
                  <Button size="sm" variant="danger" icon="RefreshCw" onClick={onRestoreSampleData}>
                    {i18n.t('settings.general.restoreSample')}
                  </Button>
                </Row>
              )}
              {importError && (
                <div
                  className="rounded-lg bg-coral-500/10 border border-coral-400/30 px-3 py-2 text-[12px] text-coral-400 flex items-center gap-2 mt-2"
                  role="alert"
                  data-testid="import-error"
                >
                  <Icon name="AlertCircle" size={13} /> {importError}
                </div>
              )}
              {importMsg && (
                <div className="rounded-lg bg-mint-500/10 border border-mint-400/30 px-3 py-2 text-[12px] text-mint-400 flex items-center gap-2 mt-2">
                  <Icon name="Check" size={13} /> {importMsg}
                </div>
              )}
            </div>
          )}

          {tab === 'storage' && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                  {i18n.t('settings.storage.mode')}
                </div>
                <div className="flex gap-3">
                  <StorageRadio
                    mode="local"
                    current={draft.storageMode}
                    onSelect={requestStorageMode}
                    label={i18n.t('settings.storage.local')}
                    icon="HardDrive"
                    hint={i18n.t('settings.storage.localHint')}
                  />
                  <StorageRadio
                    mode="cloud"
                    current={draft.storageMode}
                    onSelect={requestStorageMode}
                    label={i18n.t('settings.storage.cloud')}
                    icon="Cloud"
                    hint={user ? i18n.t('settings.storage.cloudHint') : i18n.t('settings.storage.cloudNeedsSignIn')}
                  />
                </div>
                {!user && draft.storageMode === 'cloud' && (
                  <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[12px] text-amber-400 flex items-center gap-2">
                    <Icon name="AlertCircle" size={13} /> {i18n.t('settings.storage.signInFirst')}
                  </div>
                )}
              </div>
              <div className="rounded-mac-lg bg-ink-800/50 hairline p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-ink-100">
                    {i18n.t('settings.storage.capacity')}
                  </span>
                  <span className="text-[11px] text-ink-400 tabular-nums">
                    {i18n.t('settings.storage.bookmarks', { count: library.bookmarks.length })}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500"
                    style={{ width: `${Math.min(library.bookmarks.length / 2, 100)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-mac-lg bg-ink-800/50 hairline p-4 space-y-3" data-testid="storage-data-location">
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
                  {i18n.t('settings.storage.dataLocation')}
                </div>
                <p className="text-[12px] text-ink-200 break-all" data-testid="storage-data-root-path">
                  {dataRootInfo?.dataRoot ?? '…'}
                </p>
                <Button variant="subtle" size="sm" onClick={() => void requestChangeDataRoot()}>
                  {i18n.t('settings.storage.changeLocation')}
                </Button>
                {pendingDataRootTarget && dataRootInfo && (
                  <div
                    className="rounded-lg bg-ink-900/70 hairline p-3 space-y-2"
                    role="alertdialog"
                    aria-label={i18n.t('settings.storage.migrationConfirm')}
                    data-testid="storage-data-root-confirm"
                  >
                    <p className="text-[12px] text-ink-100">{i18n.t('settings.storage.migrationConfirm')}</p>
                    <p className="text-[11px] text-ink-400">
                      {i18n.t('settings.storage.migrationSource')}: {dataRootInfo.dataRoot}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {i18n.t('settings.storage.migrationTarget')}: {pendingDataRootTarget}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => void confirmChangeDataRoot()}>
                        {i18n.t('common.confirm')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPendingDataRootTarget(null)}>
                        {i18n.t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
                {dataRootMessage && (
                  <div className="rounded-lg bg-mint-500/10 border border-mint-400/30 px-3 py-2 text-[12px] text-mint-400">
                    {dataRootMessage}
                  </div>
                )}
                {dataRootError && (
                  <div
                    className="rounded-lg bg-rose-500/10 border border-rose-400/30 px-3 py-2 text-[12px] text-rose-300"
                    data-testid="storage-data-root-error"
                  >
                    {dataRootError}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet2-500/10 border border-violet2-400/20">
                <AIBadge label="AI" />
                <span className="text-[11px] text-ink-300">
                  {i18n.t('settings.ai.hint')}
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('settings.ai.apiBase')}</label>
                <input
                  value={draft.ai.apiBase}
                  onChange={(e) => updateAI({ apiBase: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('settings.ai.model')}</label>
                <input
                  value={draft.ai.model}
                  onChange={(e) => updateAI({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('settings.ai.apiKey')}</label>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={keyConfigured ? i18n.t('settings.ai.keyConfiguredPlaceholder') : 'sk-…'}
                  aria-label={i18n.t('settings.ai.apiKey')}
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring font-mono"
                />
                <p className="text-[10px] text-ink-500 mt-1.5" data-testid="ai-key-status">
                  {keyConfigured
                    ? i18n.t('settings.ai.keyConfigured')
                    : i18n.t('settings.ai.keyUnset')}
                </p>
                {keyConfigured && (
                  <button
                    type="button"
                    className="mt-2 text-[11px] text-coral-400 hover:underline"
                    onClick={() => {
                      void deletePreferredAIKey().then(() => {
                        setKeyConfigured(false);
                        setKeyDraft('');
                      });
                    }}
                  >
                    {i18n.t('settings.ai.removeKey')}
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                  {i18n.t('settings.theme.label')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((t) => {
                    const active = draft.theme === t.id;
                    const locale = (draft.locale ?? 'en') as UiLocale;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          update({ theme: t.id });
                          applyTheme(t.id);
                        }}
                        className={`rounded-mac-lg p-3 text-left transition hairline ${
                          active ? 'ring-1 ring-accent-400/40 bg-ink-700/40' : 'bg-ink-800/50 hover:bg-ink-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-base">{t.emoji}</span>
                          <span className="text-[13px] font-semibold text-ink-100">
                            {resolveThemeLabel(t.id, locale)}
                          </span>
                          {active && <Icon name="Check" size={13} className="text-accent-300 ml-auto" />}
                        </div>
                        <div className="flex gap-1.5 mb-2">
                          {t.swatches.map((c, i) => (
                            <span key={i} className="w-5 h-5 rounded-md hairline" style={{ background: c }} />
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-400 leading-relaxed">
                          {i18n.t(themeDescKey(t.id))}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'language' && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                  {i18n.t('settings.language.label')}
                </div>
                <p className="text-[11px] text-ink-400 mb-3">{i18n.t('settings.language.hint')}</p>
                <div className="flex gap-3">
                  {(['en', 'zh'] as const).map((locale) => {
                    const active = (draft.locale ?? 'en') === locale;
                    return (
                      <button
                        type="button"
                        key={locale}
                        onClick={() => update({ locale })}
                        className={`flex-1 rounded-mac-lg p-4 text-left transition hairline ${
                          active
                            ? 'bg-accent-500/15 ring-1 ring-accent-400/40'
                            : 'bg-ink-800/50 hover:bg-ink-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink-100">
                            {i18n.t(`settings.language.${locale}`)}
                          </span>
                          {active && <Icon name="Check" size={14} className="text-accent-300 ml-auto" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'shortcuts' && (
            <ShortcutsPanel
              shortcuts={draft.shortcuts}
              locale={(draft.locale ?? 'en') as UiLocale}
              onChange={(shortcuts) => update({ shortcuts })}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/5 shrink-0">
        <Button variant="ghost" onClick={onClose}>
          {i18n.t('settings.cancel')}
        </Button>
        <Button
          variant="primary"
          icon="Check"
          onClick={() => {
            void (async () => {
              const apiBase = draft.ai.apiBase.trim();
              // 以本机 aiConsent 为准，而非 sessionStorage（REQ-019-AC-005）。
              if (
                apiBase &&
                requiresAIConsent(
                  {
                    ...getDefaultAppSettings(),
                    ai: draft.ai,
                    aiConsent: draft.aiConsent ?? null,
                  },
                  apiBase
                )
              ) {
                setConsentOpen(true);
                return;
              }
              if (keyDraft.trim()) {
                await setPreferredAIKey(keyDraft.trim());
                setKeyConfigured(true);
                setKeyDraft('');
              }
              // 必须等待持久化完成，避免 E2E reload 早于写入。
              await onSave(draft);
              onClose();
            })();
          }}
        >
          {i18n.t('settings.save')}
        </Button>
      </div>
      <ImportOverwriteDialog
        open={Boolean(pendingEnvelope && pendingSummary)}
        summary={pendingSummary ?? { bookmarks: 0, categories: 0, collections: 0, tags: 0, schemaVersion: 1 }}
        i18n={i18n}
        onCancel={() => {
          setPendingEnvelope(null);
          setPendingSummary(null);
        }}
        onConfirm={handleConfirmImport}
      />
      <StorageSwitchDialog
        open={pendingSwitchMode !== null}
        sourceMode={switchSourceMode}
        targetMode={switchTargetMode}
        sourceSummary={switchSourceSummary}
        targetSummary={switchTargetSummary}
        onCancel={() => setPendingSwitchMode(null)}
        onUseTarget={() => {
          if (!pendingSwitchMode) return;
          const target = pendingSwitchMode;
          update({ storageMode: target });
          setPendingSwitchMode(null);
          void onStorageSwitchConfirm?.('use_target', target);
        }}
        onOverwriteTarget={() => {
          if (!pendingSwitchMode) return;
          const target = pendingSwitchMode;
          update({ storageMode: target });
          setPendingSwitchMode(null);
          void onStorageSwitchConfirm?.('overwrite_target', target);
        }}
      />
      <AIConsentDialog
        open={consentOpen}
        apiBase={draft.ai.apiBase}
        onCancel={() => setConsentOpen(false)}
        onConfirm={() => {
          void (async () => {
            const apiBase = draft.ai.apiBase.trim();
            // Consent 必须随 onSave 写入桌面 settingsstore，供 Go AI 二次校验。
            const next: AppSettings = {
              ...draft,
              aiConsent: apiBase
                ? buildConsentRecord(apiBase, new Date().toISOString())
                : null,
            };
            setDraft(next);
            setConsentOpen(false);
            if (keyDraft.trim()) {
              await setPreferredAIKey(keyDraft.trim());
              setKeyConfigured(true);
              setKeyDraft('');
            }
            await onSave(next);
            onClose();
          })();
        }}
      />
    </Modal>
  );
}
