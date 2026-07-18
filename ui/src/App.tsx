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
import { loadLocalLibrary, saveLocalLibrary } from './storage';
import { applyTheme, defaultSettings } from './themes';
import {
  applySeedRestore,
  RecoveryDialog,
  shouldConfirmSeedRestore,
  useLocalStartup,
  persistUiSettings,
} from './features/auth';
import {
  applyDeleteDecision,
  DeleteBookmarkDialog,
  shouldConfirmBookmarkDelete,
} from './features/bookmarks';
import {
  applyCategoryDeleteDecision,
  applyCategoryLibraryResult,
  assignBookmarkToCategory,
  CategoryFormDialog,
  DeleteCategoryDialog,
  InvalidCategoryMoveError,
  MoveCategoryDialog,
  moveCategoryUnder,
  runCreateCategory,
  runDeleteCategory,
  shouldConfirmCategoryDelete,
  toCategoryLibrary,
} from './features/categories';
import { createBrowserStorageAdapters } from './services/storage';
import { normalizeBookmarkUrl } from './domain/commands';
import {
  clearBookmarkFilters,
  filterBookmarks,
  type SortKey,
} from './domain/query';
import { collectCategorySubtreeIds } from './domain/categories';
import { openExternalUrl } from './features/bookmarks/external-url';

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
  const startup = useLocalStartup(auth.loading);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(seedBookmarks);
  const [cats, setCats] = useState<Category[]>(seedCategories);
  const [cols, setCols] = useState<Collection[]>(seedCollections);
  const [tagList, setTagList] = useState<Tag[]>(seedTags);
  const settings = startup.settings ?? defaultSettings;
  const setSettings = startup.setSettings;
  const authed = startup.view === 'main';

  const [state, setState] = useState<AppState>({
    selection: { kind: 'all' },
    filters: emptyFilters,
    density: 'card',
    selectedBookmarkId: seedBookmarks[0]?.id ?? null,
    expandedCategories: {},
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null);
  const [categoryRecursiveConfirm, setCategoryRecursiveConfirm] = useState(false);
  const [categoryMoveId, setCategoryMoveId] = useState<string | null>(null);
  // 防止“未水合的种子数据”在加载本机库前被自动保存覆盖。
  const [libraryHydrated, setLibraryHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browserStorage = useMemo(() => createBrowserStorageAdapters(), []);

  /* ---------- when authed, load library from chosen storage ---------- */
  useEffect(() => {
    if (!authed) {
      setLibraryHydrated(false);
      return;
    }
    if (settings.storageMode === 'cloud' && auth.user) {
      setSyncing(true);
      loadCloudLibrary(auth.user.id).then((lib) => {
        if (lib) {
          setBookmarks(lib.bookmarks);
          setCats(lib.categories ?? seedCategories);
          setCols(lib.collections ?? seedCollections);
          setTagList(lib.tags ?? seedTags);
        }
        setLibraryHydrated(true);
        setSyncing(false);
      });
    } else {
      // REQ-002-AC-002：本地模式从本机恢复最后一次成功保存的资料库。
      const lib = loadLocalLibrary();
      if (lib) {
        setBookmarks(lib.bookmarks);
        setCats(lib.categories ?? seedCategories);
        setCols(lib.collections ?? seedCollections);
        setTagList(lib.tags ?? seedTags);
        setState((s) => ({ ...s, selectedBookmarkId: lib.bookmarks[0]?.id ?? null }));
      }
      setLibraryHydrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const library: LibraryData = useMemo(
    () => ({ bookmarks, categories: cats, collections: cols, tags: tagList }),
    [bookmarks, cats, cols, tagList]
  );

  /* ---------- debounced auto-save on library change ---------- */
  useEffect(() => {
    if (!authed || !libraryHydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (settings.storageMode === 'cloud' && auth.user) {
        saveCloudLibrary(auth.user.id, library);
      } else {
        saveLocalLibrary(library);
      }
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [library, settings.storageMode, auth.user, authed, libraryHydrated]);

  const insights = useMemo(() => aiBuildInsights(bookmarks), [bookmarks]);

  /* ---------- derived list ---------- */
  const visibleBookmarks = useMemo(() => {
    let list = [...bookmarks];
    const sel = state.selection;
    if (sel.kind === 'starred') list = list.filter((b) => b.starred);
    else if (sel.kind === 'recent') list = list.filter((b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400000);
    else if (sel.kind === 'category') {
      const childIds = collectCategorySubtreeIds(
        cats.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          parentId: c.parentId,
          color: c.color ?? 'gray',
        })),
        sel.id
      );
      list = list.filter((b) => childIds.has(b.categoryId));
    } else if (sel.kind === 'collection') {
      const col = cols.find((c) => c.id === sel.id);
      list = list.filter((b) => col?.bookmarkIds.includes(b.id));
    } else if (sel.kind === 'tag') {
      list = list.filter((b) => b.tags.includes(sel.id));
    } else if (sel.kind === 'health') {
      list = list.filter((b) => b.health === sel.status);
    }

    // REQ-008-AC-004 / REQ-009-AC-003：组合筛选走领域查询引擎。
    const queryable = list.map((bookmark) => ({
      ...bookmark,
      tagIds: bookmark.tags,
      readStatus: bookmark.readStatus ?? ('unread' as const),
    }));
    list = filterBookmarks(queryable, {
      onlyStarred: state.filters.onlyStarred,
      tagIds: state.filters.tagIds,
      dateRange: state.filters.dateRange,
      readStatus: state.filters.readStatus,
    });

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
    // REQ-008-AC-001：星标切换后立即更新界面并由自动保存持久化。
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)));
  }, []);

  const togglePin = useCallback((id: string) => {
    // REQ-008-AC-001：置顶切换后立即更新界面并由自动保存持久化。
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, pinned: !b.pinned } : b)));
  }, []);

  const handleVisit = useCallback(async () => {
    if (!selectedBookmark) return;
    // REQ-008-AC-002：仅在外部打开成功后增加 visitCount。
    try {
      await openExternalUrl(selectedBookmark.url);
      updateBookmark(selectedBookmark.id, {
        lastVisitedAt: new Date().toISOString(),
        visitCount: selectedBookmark.visitCount + 1,
      });
    } catch {
      flashToast('Failed to open external URL');
    }
  }, [flashToast, selectedBookmark, updateBookmark]);

  const toggleCollection = useCallback((bookmarkId: string, collectionId: string) => {
    setBookmarks((prev) => prev.map((b) => {
      if (b.id !== bookmarkId) return b;
      const has = b.collectionIds.includes(collectionId);
      return { ...b, collectionIds: has ? b.collectionIds.filter((x) => x !== collectionId) : [...b.collectionIds, collectionId] };
    }));
  }, []);

  const moveToCategory = useCallback((bookmarkId: string, categoryId: string) => {
    // REQ-011-AC-003：书签拖入分类后更新 categoryId 并显示英文提示。
    try {
      const result = assignBookmarkToCategory(
        toCategoryLibrary({ bookmarks, categories: cats, collections: cols, tags: tagList }),
        { bookmarkId, categoryId }
      );
      const applied = applyCategoryLibraryResult(result.library, bookmarks, cats);
      setBookmarks(applied.bookmarks);
      flashToast(result.message);
    } catch {
      flashToast('Failed to move bookmark');
    }
  }, [bookmarks, cats, cols, flashToast, tagList]);

  const handleMoveCategory = useCallback((categoryId: string, newParentId: string | null) => {
    // REQ-011-AC-001 / REQ-011-AC-002：合法移动更新 parentId；非法抛错并保持原树。
    try {
      const next = moveCategoryUnder(
        toCategoryLibrary({ bookmarks, categories: cats, collections: cols, tags: tagList }),
        { categoryId, newParentId }
      );
      const applied = applyCategoryLibraryResult(next, bookmarks, cats);
      setCats(applied.categories);
      flashToast('Category moved');
    } catch (error) {
      if (error instanceof InvalidCategoryMoveError) {
        flashToast(error.message);
        return;
      }
      flashToast('Failed to move category');
    }
  }, [bookmarks, cats, cols, flashToast, tagList]);

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
    // REQ-006-AC-004：规范化 URL 并生成唯一 ID；确认保存后才进入此路径。
    const normalized = normalizeBookmarkUrl(b.url);
    if (!normalized.ok) {
      flashToast('Invalid bookmark URL');
      return;
    }
    const id = 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const full: Bookmark = {
      ...b,
      id,
      url: normalized.url,
      domain: normalized.domain,
      createdAt: new Date().toISOString(),
      lastVisitedAt: null,
      visitCount: 0,
      spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    };
    setBookmarks((prev) => [full, ...prev]);
    if (full.collectionIds.length) {
      setCols((prev) =>
        prev.map((c) =>
          full.collectionIds.includes(c.id) && !c.bookmarkIds.includes(id)
            ? { ...c, bookmarkIds: [...c.bookmarkIds, id] }
            : c
        )
      );
    }
    setState((s) => ({ ...s, selectedBookmarkId: id }));
    flashToast('Bookmark saved');
  }, [flashToast]);

  const requestDeleteBookmark = useCallback((id: string) => {
    // REQ-007-AC-003：删除前弹出确认。
    if (shouldConfirmBookmarkDelete()) {
      setDeleteTargetId(id);
    }
  }, []);

  const confirmDeleteBookmark = useCallback(() => {
    if (!deleteTargetId) return;
    if (applyDeleteDecision({ confirmed: true }) !== 'deleted') return;
    const id = deleteTargetId;
    // REQ-007-AC-004：移除书签并清理主题成员引用。
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setCols((prev) =>
      prev.map((c) => ({
        ...c,
        bookmarkIds: c.bookmarkIds.filter((bid) => bid !== id),
      }))
    );
    setState((s) => ({
      ...s,
      selectedBookmarkId: s.selectedBookmarkId === id ? null : s.selectedBookmarkId,
    }));
    setDeleteTargetId(null);
    flashToast('Bookmark deleted');
  }, [deleteTargetId, flashToast]);

  const handleCreateCategory = useCallback((name: string) => {
    const parentId =
      state.selection.kind === 'category' ? state.selection.id : null;
    const result = runCreateCategory({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      name,
      parentId,
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCategoryLibraryResult(result.value, bookmarks, cats);
    setCats(applied.categories);
    setBookmarks(applied.bookmarks);
    setCategoryFormOpen(false);
    flashToast('Category created');
  }, [bookmarks, cats, cols, flashToast, state.selection, tagList]);

  const requestDeleteCategory = useCallback((categoryId: string) => {
    const childCount = cats.filter((c) => c.parentId === categoryId).length;
    const bookmarkCount = bookmarks.filter((b) => b.categoryId === categoryId).length;
    if (shouldConfirmCategoryDelete({ childCount, bookmarkCount })) {
      setCategoryDeleteId(categoryId);
      setCategoryRecursiveConfirm(false);
      return;
    }
    const result = runDeleteCategory({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      id: categoryId,
      strategy: 'move-then-delete',
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCategoryLibraryResult(result.value, bookmarks, cats);
    setCats(applied.categories);
    setBookmarks(applied.bookmarks);
    flashToast('Category deleted');
  }, [bookmarks, cats, cols, flashToast, tagList]);

  const applyCategoryDelete = useCallback((strategy: 'move-then-delete' | 'recursive-delete' | 'cancel') => {
    if (!categoryDeleteId) return;
    const decision = applyCategoryDeleteDecision({
      choice: strategy,
      recursiveConfirmed: strategy === 'recursive-delete' ? categoryRecursiveConfirm : undefined,
    });
    if (decision === 'cancelled') {
      setCategoryDeleteId(null);
      setCategoryRecursiveConfirm(false);
      return;
    }
    if (decision === 'await-recursive-confirm') {
      setCategoryRecursiveConfirm(true);
      return;
    }

    const result = runDeleteCategory({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      id: categoryDeleteId,
      strategy: decision,
      recursiveConfirmed: decision === 'recursive-delete',
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCategoryLibraryResult(result.value, bookmarks, cats);
    setCats(applied.categories);
    setBookmarks(applied.bookmarks);
    setCategoryDeleteId(null);
    setCategoryRecursiveConfirm(false);
    flashToast('Category deleted');
  }, [bookmarks, categoryDeleteId, categoryRecursiveConfirm, cats, cols, flashToast, tagList]);

  const handleSaveSettings = useCallback(async (s: AppSettings) => {
    setSettings(s);
    applyTheme(s.theme);
    await persistUiSettings(s);
    flashToast('设置已保存');
  }, [flashToast, setSettings]);

  const handleImport = useCallback((lib: LibraryData) => {
    setBookmarks(lib.bookmarks);
    if (lib.categories) setCats(lib.categories);
    if (lib.collections) setCols(lib.collections);
    if (lib.tags) setTagList(lib.tags);
    setState((s) => ({ ...s, selectedBookmarkId: lib.bookmarks[0]?.id ?? null }));
    flashToast(`已导入 ${lib.bookmarks.length} 个收藏`);
  }, [flashToast]);

  const applySampleLibrary = useCallback(() => {
    setBookmarks(seedBookmarks);
    setCats(seedCategories);
    setCols(seedCollections);
    setTagList(seedTags);
    setState((s) => ({ ...s, selectedBookmarkId: seedBookmarks[0]?.id ?? null }));
    saveLocalLibrary({
      bookmarks: seedBookmarks,
      categories: seedCategories,
      collections: seedCollections,
      tags: seedTags,
    });
    flashToast('Sample data restored');
  }, [flashToast]);

  const handleRestoreSampleData = useCallback(() => {
    const hasLocalData = browserStorage.hasLocalLibraryData() || bookmarks.length > 0;
    if (shouldConfirmSeedRestore(hasLocalData)) {
      setSeedConfirmOpen(true);
      return;
    }
    if (applySeedRestore({ hasLocalData, confirmed: false }) === 'applied') {
      applySampleLibrary();
    }
  }, [applySampleLibrary, bookmarks.length, browserStorage]);

  const markSignedOut = startup.markSignedOut;
  const handleSignOut = useCallback(async () => {
    // REQ-002-AC-003：Sign Out 返回认证界面且保留本机资料库。
    await auth.signOut();
    setSettingsOpen(false);
    markSignedOut();
  }, [auth, markSignedOut]);

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

  /* ---------- loading gate：禁止在引导完成前闪登录或主界面 ---------- */
  if (startup.view === 'loading') {
    return (
      <div className="h-screen w-screen workspace flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (startup.view === 'recovery') {
    return (
      <RecoveryDialog
        onCancel={() => {
          startup.setRecoveryPending(false);
          startup.markSignedOut();
        }}
        onConfirm={() => {
          const lib = loadLocalLibrary();
          if (lib) {
            setBookmarks(lib.bookmarks);
            setCats(lib.categories ?? seedCategories);
            setCols(lib.collections ?? seedCollections);
            setTagList(lib.tags ?? seedTags);
          }
          startup.setRecoveryPending(false);
          void startup.enterLocalMode(settings);
        }}
      />
    );
  }

  /* ---------- login gate ---------- */
  if (startup.view === 'login') {
    return (
      <LoginScreen
        loading={false}
        error={auth.error}
        onSignIn={async (email, password) => {
          const { error } = await auth.signIn(email, password);
          if (!error) startup.markAuthenticated();
        }}
        onSignUp={async (email, password) => {
          const { error } = await auth.signUp(email, password);
          if (!error) startup.markAuthenticated();
        }}
        onUseLocal={() => {
          void startup.enterLocalMode(settings);
        }}
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
                onDropToCategory={(categoryId, bookmarkId) => moveToCategory(bookmarkId, categoryId)}
                onDropToCollection={(collectionId, bookmarkId) => addToCollection(bookmarkId, collectionId)}
                onOpenInsights={() => setInsightsOpen(true)}
                onNewBookmark={() => { setNewUrl(''); setNewOpen(true); }}
                onNewCategory={() => setCategoryFormOpen(true)}
                onDeleteCategory={requestDeleteCategory}
                onMoveCategory={(categoryId, newParentId) => handleMoveCategory(categoryId, newParentId)}
                onRequestMoveCategory={(categoryId) => setCategoryMoveId(categoryId)}
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
              sort={sortKey}
              onSort={(next) => setSortKey(next as SortKey)}
              onDensity={(d: ViewDensity) => setState((s) => ({ ...s, density: d }))}
              onSearch={(q) => setFilters({ query: q })}
              onOpenSpotlight={() => setSpotlightOpen(true)}
              onSelectBookmark={(id) => setState((s) => ({ ...s, selectedBookmarkId: id }))}
              onToggleStar={toggleStar}
              onClearTagFilter={(id) => setFilters({ tagIds: state.filters.tagIds.filter((t) => t !== id) })}
              onDateRange={(r) => setFilters({ dateRange: r })}
              onToggleStarredFilter={() => setFilters({ onlyStarred: !state.filters.onlyStarred })}
              onReadStatusFilter={(status) => setFilters({ readStatus: status })}
              onClearFilters={() => {
                // REQ-009-AC-004：清除筛选，恢复导航范围内完整结果。
                const cleared = clearBookmarkFilters();
                setFilters({ ...emptyFilters, ...cleared, query: '' });
              }}
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
                onTogglePin={() => selectedBookmark && togglePin(selectedBookmark.id)}
                onToggleCollection={(cid) => selectedBookmark && toggleCollection(selectedBookmark.id, cid)}
                onVisit={() => { void handleVisit(); }}
                onOpenHealth={() => setHealthOpen(true)}
                onDelete={() => selectedBookmark && requestDeleteBookmark(selectedBookmark.id)}
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
      {deleteTargetId && (
        <DeleteBookmarkDialog
          title={bookmarks.find((b) => b.id === deleteTargetId)?.title ?? 'Bookmark'}
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={confirmDeleteBookmark}
        />
      )}
      {categoryFormOpen && (
        <CategoryFormDialog
          mode="create"
          onCancel={() => setCategoryFormOpen(false)}
          onSubmit={handleCreateCategory}
        />
      )}
      {categoryDeleteId && (
        <DeleteCategoryDialog
          name={cats.find((c) => c.id === categoryDeleteId)?.name ?? 'Category'}
          childCount={cats.filter((c) => c.parentId === categoryDeleteId).length}
          bookmarkCount={bookmarks.filter((b) => b.categoryId === categoryDeleteId).length}
          awaitingRecursiveConfirm={categoryRecursiveConfirm}
          onCancel={() => applyCategoryDelete('cancel')}
          onMoveThenDelete={() => applyCategoryDelete('move-then-delete')}
          onRecursiveDelete={() => applyCategoryDelete('recursive-delete')}
        />
      )}
      {categoryMoveId && (
        <MoveCategoryDialog
          categoryId={categoryMoveId}
          categories={cats}
          onCancel={() => setCategoryMoveId(null)}
          onConfirm={(newParentId) => {
            handleMoveCategory(categoryMoveId, newParentId);
            setCategoryMoveId(null);
          }}
        />
      )}
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
        onRestoreSampleData={handleRestoreSampleData}
      />

      {seedConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="seed-confirm-title">
          <div className="w-full max-w-md rounded-xl bg-ink-900 hairline p-6 shadow-win">
            <h2 id="seed-confirm-title" className="text-[16px] font-semibold text-ink-100">
              Replace current library?
            </h2>
            <p className="mt-2 text-[13px] text-ink-300">
              Restoring sample data will replace your current local library. This cannot be undone from this dialog.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md px-3 py-1.5 text-[12px] text-ink-300 hover:bg-ink-800" onClick={() => setSeedConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-coral-500 px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110"
                onClick={() => {
                  if (applySeedRestore({ hasLocalData: true, confirmed: true }) === 'applied') {
                    applySampleLibrary();
                  }
                  setSeedConfirmOpen(false);
                  setSettingsOpen(false);
                }}
              >
                Restore sample data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

