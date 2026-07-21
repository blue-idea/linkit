import { useEffect, useState } from 'react';
import { Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';
import type { UiLocale } from '../../types';
import {
  SHORTCUT_ACTION_IDS,
  applyShortcutChange,
  formatAcceleratorForDisplay,
  mergeShortcuts,
  resetShortcutsToDefaults,
  type ShortcutActionId,
  type ShortcutMap,
} from '../shell/shortcuts';

type ShortcutsPanelProps = {
  shortcuts?: Partial<ShortcutMap> | null;
  locale: UiLocale;
  onChange: (shortcuts: ShortcutMap) => void;
};

function eventToAccelerator(event: KeyboardEvent): string | null {
  if (!(event.metaKey || event.ctrlKey)) return null;
  if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Shift' || event.key === 'Alt') {
    return null;
  }
  if (event.key === ',') return 'CmdOrCtrl+,';
  if (event.key === '\\') return 'CmdOrCtrl+\\';
  if (event.key.length === 1) return `CmdOrCtrl+${event.key.toUpperCase()}`;
  return null;
}

/**
 * Settings → Shortcuts：列出全部可配置快捷键，支持改绑、冲突提示与恢复默认。
 * REQ-030-AC-006~009
 */
export function ShortcutsPanel({ shortcuts, locale, onChange }: ShortcutsPanelProps) {
  const i18n = useI18n(locale);
  const current = mergeShortcuts(shortcuts);
  const [listening, setListening] = useState<ShortcutActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const platform = navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'windows';

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const accelerator = eventToAccelerator(event);
      if (!accelerator) return;
      const result = applyShortcutChange(current, listening, accelerator);
      if (!result.ok) {
        setError(i18n.t('settings.shortcuts.conflict'));
        setListening(null);
        return;
      }
      setError(null);
      setListening(null);
      onChange(result.shortcuts);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, current, i18n, onChange]);

  return (
    <div className="space-y-3" aria-label={i18n.t('settings.section.shortcuts')}>
      <p className="text-[12px] text-ink-400">{i18n.t('settings.shortcuts.hint')}</p>
      {error && (
        <p role="alert" className="text-[12px] text-coral-300">
          {error}
        </p>
      )}
      <ul className="space-y-1">
        {SHORTCUT_ACTION_IDS.map((actionId) => (
          <li
            key={actionId}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-ink-800/40 hairline"
          >
            <span className="text-[13px] text-ink-100">
              {i18n.t(`settings.shortcuts.action.${actionId}`)}
            </span>
            <button
              type="button"
              className="text-[12px] font-mono text-ink-200 px-2 py-1 rounded-md bg-ink-900/60 hover:bg-ink-700/60 focus-ring"
              aria-label={i18n.t('settings.shortcuts.editBinding', {
                action: i18n.t(`settings.shortcuts.action.${actionId}`),
              })}
              onClick={() => {
                setError(null);
                setListening(actionId);
              }}
            >
              {listening === actionId
                ? '...'
                : formatAcceleratorForDisplay(current[actionId], platform)}
            </button>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="subtle"
        onClick={() => {
          setError(null);
          setListening(null);
          onChange(resetShortcutsToDefaults());
        }}
      >
        {i18n.t('settings.shortcuts.restoreDefaults')}
      </Button>
    </div>
  );
}
