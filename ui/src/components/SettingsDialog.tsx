import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppSettings, LibraryData, StorageMode } from '../types';
import { themes, applyTheme } from '../themes';
import { Icon, Button, AIBadge } from './ui';
import { exportLibrary, importLibrary } from '../storage';

type Tab = 'general' | 'storage' | 'ai' | 'appearance';

function Modal({ open, onClose, children, width = 'max-w-[640px]' }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div className={`relative w-full ${width} rounded-mac-xl glass-strong ring-glow overflow-hidden animate-scale-in max-h-[88vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, label, children, hint }: { icon: string; label: string; children: React.ReactNode; hint?: string }) {
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

function StorageRadio({ mode, current, onSelect, label, icon, hint }: { mode: StorageMode; current: StorageMode; onSelect: (m: StorageMode) => void; label: string; icon: string; hint: string }) {
  const active = mode === current;
  return (
    <button
      onClick={() => onSelect(mode)}
      className={`flex-1 rounded-mac-lg p-4 text-left transition hairline ${active ? 'bg-accent-500/15 ring-1 ring-accent-400/40' : 'bg-ink-800/50 hover:bg-ink-700/60'}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-accent-500/20' : 'bg-ink-700/60'}`}>
          <Icon name={icon} size={15} className={active ? 'text-accent-300' : 'text-ink-300'} />
        </span>
        <span className="text-[13px] font-semibold text-ink-100">{label}</span>
        {active && <Icon name="Check" size={14} className="text-accent-300 ml-auto" />}
      </div>
      <p className="text-[11px] text-ink-400 leading-relaxed">{hint}</p>
    </button>
  );
}

export function SettingsDialog({
  open,
  settings,
  user,
  library,
  onClose,
  onSave,
  onImport,
  onSignOut,
}: {
  open: boolean;
  settings: AppSettings;
  user: User | null;
  library: LibraryData;
  onClose: () => void;
  onSave: (s: AppSettings) => void;
  onImport: (lib: LibraryData) => void;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setDraft(settings); setImportMsg(null); } }, [open, settings]);

  const update = (patch: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const updateAI = (patch: Partial<AppSettings['ai']>) => setDraft((d) => ({ ...d, ai: { ...d.ai, ...patch } }));

  const handleImport = async (file: File) => {
    try {
      const lib = await importLibrary(file);
      onImport(lib);
      setImportMsg(`已导入 ${lib.bookmarks.length} 个收藏`);
    } catch (e) {
      setImportMsg(`导入失败：${(e as Error).message}`);
    }
  };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'general', icon: 'User', label: '通用' },
    { id: 'storage', icon: 'Database', label: '存储' },
    { id: 'ai', icon: 'Sparkles', label: 'AI' },
    { id: 'appearance', icon: 'Palette', label: '外观' },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
        <Icon name="Settings" size={18} className="text-ink-200" />
        <span className="text-[15px] font-semibold text-ink-100">设置</span>
        <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition">
          <Icon name="X" size={16} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tab sidebar */}
        <div className="w-44 shrink-0 border-r border-white/5 p-2 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition ${tab === t.id ? 'bg-accent-500/20 text-ink-100' : 'text-ink-300 hover:bg-ink-700/50 hover:text-ink-100'}`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto scroll-thin p-5">
          {tab === 'general' && (
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">账户</div>
              <Row icon="Mail" label={user?.email ?? '未登录'} hint={user ? '已登录，可使用云同步' : '本地模式，数据保存在浏览器'}>
                {user ? (
                  <Button size="sm" variant="danger" icon="LogOut" onClick={onSignOut}>退出登录</Button>
                ) : (
                  <span className="text-[11px] text-ink-400">本地</span>
                )}
              </Row>
              <div className="h-px bg-white/5 my-2" />
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">数据</div>
              <Row icon="Download" label="导出数据" hint="将全部收藏导出为 JSON 文件">
                <Button size="sm" variant="subtle" icon="Download" onClick={() => exportLibrary(library)}>导出</Button>
              </Row>
              <Row icon="Upload" label="导入数据" hint="从 JSON 文件导入收藏（将覆盖当前数据）">
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
                <Button size="sm" variant="subtle" icon="Upload" onClick={() => fileRef.current?.click()}>导入</Button>
              </Row>
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
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">存储模式</div>
                <div className="flex gap-3">
                  <StorageRadio
                    mode="local"
                    current={draft.storageMode}
                    onSelect={(m) => update({ storageMode: m })}
                    label="本地存储"
                    icon="HardDrive"
                    hint="数据保存在浏览器 localStorage，不联网，刷新不丢失，但换设备不同步。"
                  />
                  <StorageRadio
                    mode="cloud"
                    current={draft.storageMode}
                    onSelect={(m) => update({ storageMode: m })}
                    label="云存储"
                    icon="Cloud"
                    hint={user ? '数据同步到你的账户，多设备共享。需保持登录。' : '需要先登录才能使用云存储。'}
                  />
                </div>
                {!user && draft.storageMode === 'cloud' && (
                  <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[12px] text-amber-400 flex items-center gap-2">
                    <Icon name="AlertCircle" size={13} /> 请先登录账户后再切换到云存储。
                  </div>
                )}
              </div>
              <div className="rounded-mac-lg bg-ink-800/50 hairline p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-ink-100">当前库容量</span>
                  <span className="text-[11px] text-ink-400 tabular-nums">{library.bookmarks.length} 个收藏</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-700/60 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500" style={{ width: `${Math.min(library.bookmarks.length / 2, 100)}%` }} />
                </div>
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet2-500/10 border border-violet2-400/20">
                <AIBadge label="AI 配置" />
                <span className="text-[11px] text-ink-300">自定义 AI 服务的接口地址、模型与密钥，用于摘要、标签建议与语义搜索。</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">API 地址</label>
                <input
                  value={draft.ai.apiBase}
                  onChange={(e) => updateAI({ apiBase: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">模型名称</label>
                <input
                  value={draft.ai.model}
                  onChange={(e) => updateAI({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">API Key</label>
                <input
                  type="password"
                  value={draft.ai.apiKey}
                  onChange={(e) => updateAI({ apiKey: e.target.value })}
                  placeholder="sk-…"
                  className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring font-mono"
                />
                <p className="text-[10px] text-ink-500 mt-1.5">密钥仅保存在本地，不会上传到服务器。留空则使用内置模拟 AI。</p>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">主题皮肤</div>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((t) => {
                    const active = draft.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { update({ theme: t.id }); applyTheme(t.id); }}
                        className={`rounded-mac-lg p-3 text-left transition hairline ${active ? 'ring-1 ring-accent-400/40 bg-ink-700/40' : 'bg-ink-800/50 hover:bg-ink-700/60'}`}
                      >
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-base">{t.emoji}</span>
                          <span className="text-[13px] font-semibold text-ink-100">{t.name}</span>
                          {active && <Icon name="Check" size={13} className="text-accent-300 ml-auto" />}
                        </div>
                        <div className="flex gap-1.5 mb-2">
                          {t.swatches.map((c, i) => (
                            <span key={i} className="w-5 h-5 rounded-md hairline" style={{ background: c }} />
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-400 leading-relaxed">{t.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/5 shrink-0">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" icon="Check" onClick={() => { onSave(draft); onClose(); }}>保存设置</Button>
      </div>
    </Modal>
  );
}
