import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, Bookmark, Category, Collection, LibraryData, Tag, ViewDensity } from './types';
import type { AppState, Filters, Selection } from './state';
import { emptyFilters } from './state';
import { bookmarks as seedBookmarks, categories as seedCategories, collections as seedCollections, tags as seedTags } from './data';
import { aiBuildInsights } from './ai';
import { Icon, Kbd } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { DetailPanel } from './components/DetailPanel';
import { Spotlight } from './components/Spotlight';
import { NewBookmarkDialog, InsightsDialog, HealthDialog } from './components/Dialogs';
import { LoginScreen } from './components/LoginScreen';
import { SettingsDialog } from './components/SettingsDialog';
import { useAuth } from './auth';
import { loadCloudLibrary, saveCloudLibrary } from './cloud';
import { loadLocalLibrary, saveLocalLibrary, loadSettings, saveSettings } from './storage';
import { applyTheme, defaultSettings } from './themes';

/* ---------- window chrome ---------- */
function WindowChrome({
  onSpotlight,
  onNew,
  onSettings,
  user,
  storageMode,
  sidebarOpen,
  detailOpen,
  onToggleSidebar,
  onToggleDetail,
}: {
  onSpotlight: () => void;
  onNew: () => void;
  onSettings: () => void;
  user: { email: string } | null;
  storageMode: string;
  sidebarOpen: boolean;
  detailOpen: boolean;
  onToggleSidebar: () => void;
  onToggleDetail: () => void;
}) {
  return (
    <div className="h-11 shrink-0 glass-strong border-b border-white/5 flex items-center px-4 gap-3 no-select relative">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-coral-500 hover:brightness-110 transition cursor-pointer" />
        <span className="w-3 h-3 rounded-full bg-amber-500 hover:brightness-110 transition cursor-pointer" />
        <span className="w-3 h-3 rounded-full bg-mint-500 hover:brightness-110 transition cursor-pointer" />
      </div>

      <button
        onClick={onToggleSidebar}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition ${sidebarOpen ? 'text-ink-200 hover:bg-ink-700/60' : 'text-ink-500 hover:bg-ink-700/60'}`}
        title="切换侧边栏"
      >
        <Icon name="PanelLeft" size={14} />
      </button>

      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-100">
        <span className="w-4 h-4 rounded bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center">
          <Icon name="Boxes" size={10} className="text-white" />
        </span>
        Lattice
        <span className="text-ink-600 font-normal hidden sm:inline">—</span>
        <span className="text-[12px] text-ink-400 font-normal hidden sm:inline">网址收藏管理</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:flex items-center gap-1.5 text-[10px] text-ink-400 px-2 py-1 rounded-md bg-ink-800/50 hairline">
          <Icon name={storageMode === 'cloud' ? 'Cloud' : 'HardDrive'} size={10} />
          {storageMode === 'cloud' ? '云存储' : '本地存储'}
        </span>
        {user && (
          <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-ink-300 max-w-[160px]">
            <Icon name="User" size={11} className="text-ink-400" />
            <span className="truncate">{user.email}</span>
          </span>
        )}
        <button onClick={onSpotlight} className="flex items-center gap-2 rounded-md bg-ink-800/60 hairline px-2.5 py-1 text-[11px] text-ink-400 hover:text-ink-200 transition">
          <Icon name="Search" size={11} />
          <span className="hidden sm:inline">搜索</span>
          <span className="flex items-center gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-md bg-ink-800/60 hairline px-2.5 py-1 text-[11px] text-ink-400 hover:text-ink-200 transition">
          <Icon name="Plus" size={11} />
          <span className="hidden sm:inline">新增</span>
        </button>
        <button onClick={onSettings} className="w-7 h-7 rounded-md bg-ink-800/60 hairline text-ink-400 hover:text-ink-200 flex items-center justify-center transition" title="设置">
          <Icon name="Settings" size={13} />
        </button>
        <button
          onClick={onToggleDetail}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition ${detailOpen ? 'text-ink-200 hover:bg-ink-700/60' : 'text-ink-500 hover:bg-ink-700/60'}`}
          title="切换详情面板"
        >
          <Icon name="PanelRight" size={14} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const [authed, setAuthed] = useState(false); // true once user signs in OR picks local mode
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(seedBookmarks);
  const [cats, setCats] = useState<Category[]>(seedCategories);
  const [cols, setCols] = useState<Collection[]>(seedCollections);
  const [tagList, setTagList] = useState<Tag[]>(seedTags);

  const [state, setState] = useState<AppState>({
    selection: { kind: 'all' },
    filters: emptyFilters,
    density: 'card',
    selectedBookmarkId: seedBookmarks[0]?.id ?? null,
    expandedCategories: {},
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(true);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- init: load settings + apply theme ---------- */
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyTheme(s.theme);
  }, []);

  /* ---------- when authed, load library from chosen storage ---------- */
  useEffect(() => {
    if (!authed) return;
    if (settings.storageMode === 'cloud' && auth.user) {
      setSyncing(true);
      loadCloudLibrary(auth.user.id).then((lib) => {
        if (lib) {
          setBookmarks(lib.bookmarks);
          setCats(lib.categories ?? seedCategories);
          setCols(lib.collections ?? seedCollections);
          setTagList(lib.tags ?? seedTags);
        }
        setSyncing(false);
      });
    } else {
      const lib = loadLocalLibrary();
      if (lib) {
        setBookmarks(lib.bookmarks);
        setCats(lib.categories ?? seedCategories);
        setCols(lib.collections ?? seedCollections);
        setTagList(lib.tags ?? seedTags);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const library: LibraryData = useMemo(
    () => ({ bookmarks, categories: cats, collections: cols, tags: tagList }),
    [bookmarks, cats, cols, tagList]
  );

  /* ---------- debounced auto-save on library change ---------- */
  useEffect(() => {
    if (!authed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (settings.storageMode === 'cloud' && auth.user) {
        saveCloudLibrary(auth.user.id, library);
      } else {
        saveLocalLibrary(library);
      }
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [library, settings.storageMode, auth.user, authed]);

  const insights = useMemo(() => aiBuildInsights(bookmarks, cols), [bookmarks, cols]);

  /* ---------- derived list ---------- */
  const visibleBookmarks = useMemo(() => {
    let list = [...bookmarks];
    const sel = state.selection;
    if (sel.kind === 'starred') list = list.filter((b) => b.starred);
    else if (sel.kind === 'recent') list = list.filter((b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400000);
    else if (sel.kind === 'category') {
      const childIds = collectCategoryIds(sel.id, cats);
      list = list.filter((b) => childIds.has(b.categoryId));
    } else if (sel.kind === 'collection') {
      const col = cols.find((c) => c.id === sel.id);
      list = list.filter((b) => col?.bookmarkIds.includes(b.id));
    } else if (sel.kind === 'tag') {
      list = list.filter((b) => b.tags.includes(sel.id));
    } else if (sel.kind === 'health') {
      list = list.filter((b) => b.health === sel.status);
    }
    if (state.filters.onlyStarred) list = list.filter((b) => b.starred);
    if (state.filters.tagIds.length) list = list.filter((b) => state.filters.tagIds.every((t) => b.tags.includes(t)));
    if (state.filters.dateRange !== 'all') {
      const days = state.filters.dateRange === '7d' ? 7 : state.filters.dateRange === '30d' ? 30 : 90;
      list = list.filter((b) => new Date(b.createdAt).getTime() > Date.now() - days * 86400000);
    }
    if (state.filters.query.trim()) {
      const q = state.filters.query.toLowerCase();
      list = list.filter((b) => (b.title + b.description + b.domain).toLowerCase().includes(q));
    }
    return list;
  }, [bookmarks, state.selection, state.filters, cats, cols]);

  const selectedBookmark = bookmarks.find((b) => b.id === state.selectedBookmarkId) ?? null;

  /* ---------- actions ---------- */
  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const updateBookmark = useCallback((id: string, patch: Partial<Bookmark>) => {
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)));
  }, []);

  const toggleCollection = useCallback((bookmarkId: string, collectionId: string) => {
    setBookmarks((prev) => prev.map((b) => {
      if (b.id !== bookmarkId) return b;
      const has = b.collectionIds.includes(collectionId);
      return { ...b, collectionIds: has ? b.collectionIds.filter((x) => x !== collectionId) : [...b.collectionIds, collectionId] };
    }));
  }, []);

  const moveToCategory = useCallback((bookmarkId: string, categoryId: string) => {
    setBookmarks((prev) => prev.map((b) => (b.id === bookmarkId ? { ...b, categoryId } : b)));
    const cat = cats.find((c) => c.id === categoryId);
    flashToast(`已移动到「${cat?.name ?? '分类'}」`);
  }, [cats, flashToast]);

  const addToCollection = useCallback((bookmarkId: string, collectionId: string) => {
    setBookmarks((prev) => prev.map((b) => {
      if (b.id !== bookmarkId) return b;
      if (b.collectionIds.includes(collectionId)) return b;
      return { ...b, collectionIds: [...b.collectionIds, collectionId] };
    }));
    const col = cols.find((c) => c.id === collectionId);
    flashToast(`已加入主题「${col?.name ?? ''}」`);
  }, [cols, flashToast]);

  const acceptAICollection = useCallback((ids: string[]) => {
    if (state.selection.kind !== 'collection') return;
    const colId = state.selection.id;
    setBookmarks((prev) => prev.map((b) => ids.includes(b.id) && !b.collectionIds.includes(colId)
      ? { ...b, collectionIds: [...b.collectionIds, colId] }
      : b));
    flashToast(`已将 ${ids.length} 项加入主题`);
  }, [state.selection, flashToast]);

  const createBookmark = useCallback((b: Omit<Bookmark, 'id' | 'createdAt' | 'lastVisitedAt' | 'visitCount' | 'spark'>) => {
    const id = 'b-' + Date.now().toString(36);
    const full: Bookmark = { ...b, id, createdAt: new Date().toISOString(), lastVisitedAt: null, visitCount: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] };
    setBookmarks((prev) => [full, ...prev]);
    setState((s) => ({ ...s, selectedBookmarkId: id }));
    flashToast('收藏已入库');
  }, [flashToast]);

  const handleSaveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    applyTheme(s.theme);
    saveSettings(s);
    flashToast('设置已保存');
  }, [flashToast]);

  const handleImport = useCallback((lib: LibraryData) => {
    setBookmarks(lib.bookmarks);
    if (lib.categories) setCats(lib.categories);
    if (lib.collections) setCols(lib.collections);
    if (lib.tags) setTagList(lib.tags);
    setState((s) => ({ ...s, selectedBookmarkId: lib.bookmarks[0]?.id ?? null }));
    flashToast(`已导入 ${lib.bookmarks.length} 个收藏`);
  }, [flashToast]);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setAuthed(false);
    setSettingsOpen(false);
    setBookmarks(seedBookmarks);
    setCats(seedCategories);
    setCols(seedCollections);
    setTagList(seedTags);
  }, [auth]);

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'k') { e.preventDefault(); setSpotlightOpen(true); }
      else if (meta && e.key === 'n') { e.preventDefault(); setNewUrl(''); setNewOpen(true); }
      else if (meta && e.key === 'i') { e.preventDefault(); setInsightsOpen(true); }
      else if (meta && e.key === ',') { e.preventDefault(); setSettingsOpen(true); }
      else if (meta && e.key === '1') setState((s) => ({ ...s, density: 'card' }));
      else if (meta && e.key === '2') setState((s) => ({ ...s, density: 'list' }));
      else if (meta && e.key === '3') setState((s) => ({ ...s, density: 'masonry' }));
      else if (meta && e.key === '\\') { e.preventDefault(); setSidebarOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- global drag-to-window for URL ingest ---------- */
  useEffect(() => {
    const onDragOver = (e: DragEvent) => { if (e.dataTransfer?.types.includes('text/uri-list') || e.dataTransfer?.types.includes('text/plain')) { e.preventDefault(); setDragActive(true); } };
    const onDragLeave = (e: DragEvent) => { if (e.relatedTarget === null) setDragActive(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const uri = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || '';
      if (uri && /^https?:\/\//i.test(uri)) { setNewUrl(uri); setNewOpen(true); }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const setFilters = (patch: Partial<Filters>) => setState((s) => ({ ...s, filters: { ...s.filters, ...patch } }));

  /* ---------- loading gate ---------- */
  if (auth.loading) {
    return <div className="h-screen w-screen workspace flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>;
  }

  /* ---------- login gate ---------- */
  if (!authed) {
    return (
      <LoginScreen
        loading={false}
        error={auth.error}
        onSignIn={async (email, password) => { const { error } = await auth.signIn(email, password); if (!error) setAuthed(true); }}
        onSignUp={async (email, password) => { const { error } = await auth.signUp(email, password); if (!error) setAuthed(true); }}
        onUseLocal={() => { setAuthed(true); setSettings((s) => ({ ...s, storageMode: 'local' })); }}
      />
    );
  }

  return (
    <div className="h-screen w-screen workspace flex items-center justify-center p-0 md:p-6 overflow-hidden">
      <div className="w-full h-full md:max-w-[1400px] md:max-h-[880px] rounded-none md:rounded-mac-xl glass-strong shadow-win overflow-hidden flex flex-col">
        <WindowChrome
          onSpotlight={() => setSpotlightOpen(true)}
          onNew={() => { setNewUrl(''); setNewOpen(true); }}
          onSettings={() => setSettingsOpen(true)}
          user={auth.user ? { email: auth.user.email ?? '' } : null}
          storageMode={settings.storageMode}
          sidebarOpen={sidebarOpen}
          detailOpen={detailOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleDetail={() => setDetailOpen((v) => !v)}
        />

        {syncing && (
          <div className="h-0.5 bg-accent-500/30 overflow-hidden">
            <div className="h-full w-1/3 bg-accent-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-[248px] shrink-0 hidden sm:block animate-slide-down">
              <Sidebar
                categories={cats}
                collections={cols}
                tags={tagList}
                bookmarks={bookmarks}
                selection={state.selection}
                expanded={state.expandedCategories}
                onToggleExpand={(id) => setState((s) => ({ ...s, expandedCategories: { ...s.expandedCategories, [id]: !(s.expandedCategories[id] ?? false) } }))}
                onSelect={(sel: Selection) => setState((s) => ({ ...s, selection: sel, filters: emptyFilters }))}
                onDropToCategory={moveToCategory}
                onDropToCollection={addToCollection}
                onOpenInsights={() => setInsightsOpen(true)}
                onNewBookmark={() => { setNewUrl(''); setNewOpen(true); }}
                insightCount={insights.length}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <ContentArea
              bookmarks={visibleBookmarks}
              allBookmarks={bookmarks}
              tags={tagList}
              categories={cats}
              collections={cols}
              selection={state.selection}
              filters={state.filters}
              density={state.density}
              selectedId={state.selectedBookmarkId}
              sort="recent"
              onSort={() => {}}
              onDensity={(d: ViewDensity) => setState((s) => ({ ...s, density: d }))}
              onSearch={(q) => setFilters({ query: q })}
              onOpenSpotlight={() => setSpotlightOpen(true)}
              onSelectBookmark={(id) => setState((s) => ({ ...s, selectedBookmarkId: id }))}
              onToggleStar={toggleStar}
              onClearTagFilter={(id) => setFilters({ tagIds: state.filters.tagIds.filter((t) => t !== id) })}
              onDateRange={(r) => setFilters({ dateRange: r })}
              onToggleStarredFilter={() => setFilters({ onlyStarred: !state.filters.onlyStarred })}
              onAcceptAICollection={acceptAICollection}
              onDismissAICollection={() => {}}
              onNewBookmark={() => { setNewUrl(''); setNewOpen(true); }}
              onDragStartBookmark={() => {}}
            />
          </div>

          {/* Detail */}
          {detailOpen && (
            <div className="w-[320px] shrink-0 hidden lg:block animate-slide-down">
              <DetailPanel
                bookmark={selectedBookmark}
                tags={tagList}
                categories={cats}
                collections={cols}
                onUpdate={(patch) => selectedBookmark && updateBookmark(selectedBookmark.id, patch)}
                onToggleStar={() => selectedBookmark && toggleStar(selectedBookmark.id)}
                onTogglePin={() => selectedBookmark && updateBookmark(selectedBookmark.id, { pinned: !selectedBookmark.pinned })}
                onToggleCollection={(cid) => selectedBookmark && toggleCollection(selectedBookmark.id, cid)}
                onVisit={() => {
                  if (!selectedBookmark) return;
                  updateBookmark(selectedBookmark.id, { lastVisitedAt: new Date().toISOString(), visitCount: selectedBookmark.visitCount + 1 });
                  window.open(selectedBookmark.url, '_blank');
                }}
                onOpenHealth={() => setHealthOpen(true)}
                onClose={() => setState((s) => ({ ...s, selectedBookmarkId: null }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Drag-to-ingest overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="absolute inset-6 rounded-mac-xl border-2 border-dashed border-accent-400/50 dropzone-dash" />
          <div className="glass-strong rounded-mac-xl px-8 py-6 ring-glow flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <Icon name="Link" size={22} className="text-accent-300" />
            </div>
            <div className="text-[15px] font-semibold text-ink-100">拖入网址即可收藏</div>
            <div className="text-[12px] text-ink-400">AI 将自动抓取内容并生成摘要、分类与标签</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="glass-strong rounded-full px-4 py-2 hairline flex items-center gap-2 shadow-float">
            <Icon name="Check" size={14} className="text-mint-400" />
            <span className="text-[12px] text-ink-100 font-medium">{toast}</span>
          </div>
        </div>
      )}

      {/* Overlays */}
      <Spotlight
        open={spotlightOpen}
        bookmarks={bookmarks}
        tags={tagList}
        categories={cats}
        collections={cols}
        onSelect={(id) => setState((s) => ({ ...s, selectedBookmarkId: id }))}
        onClose={() => setSpotlightOpen(false)}
        onNewFromUrl={(url) => { setNewUrl(url); setNewOpen(true); }}
      />
      <NewBookmarkDialog
        open={newOpen}
        initialUrl={newUrl}
        categories={cats}
        tags={tagList}
        collections={cols}
        onClose={() => setNewOpen(false)}
        onCreate={createBookmark}
      />
      <InsightsDialog
        open={insightsOpen}
        insights={insights}
        bookmarks={bookmarks}
        onClose={() => setInsightsOpen(false)}
        onAction={(ins) => {
          setInsightsOpen(false);
          if (ins.type === 'collection') setState((s) => ({ ...s, selection: { kind: 'collection', id: 'col-inspiration' } }));
          else if (ins.type === 'stale' && ins.id === 'i-changed') setState((s) => ({ ...s, selection: { kind: 'health', status: 'changed' } }));
          else if (ins.type === 'trend') setState((s) => ({ ...s, selection: { kind: 'all' } }));
        }}
      />
      <HealthDialog open={healthOpen} bookmarks={bookmarks} onClose={() => setHealthOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        user={auth.user}
        library={library}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        onImport={handleImport}
        onSignOut={handleSignOut}
      />
    </div>
  );
}

/* collect a category id and all its descendants */
function collectCategoryIds(rootId: string, cats: Category[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of cats) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); added = true; }
    }
  }
  return ids;
}
