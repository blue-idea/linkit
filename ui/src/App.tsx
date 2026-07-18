import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, Bookmark, Category, Collection, LibraryData, Tag, ViewDensity } from './types';
import type { AppState, Filters, Selection } from './state';
import { emptyFilters } from './state';
import { bookmarks as seedBookmarks, categories as seedCategories, collections as seedCollections, tags as seedTags } from './data';
import { aiBuildInsights } from './ai';
import { Icon } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { DetailPanel } from './components/DetailPanel';
import { Spotlight } from './components/Spotlight';
import { NewBookmarkDialog, InsightsDialog, HealthDialog, ReanalyzeBookmarkDialog } from './components/Dialogs';
import { LoginScreen } from './components/LoginScreen';
import { SettingsDialog } from './components/SettingsDialog';
import {
  CloudConflictDialog,
  CloudDraftRecoveryDialog,
} from './features/storage';
import {
  AppShell,
  useEscapeOverlayStack,
  useGlobalShortcuts,
  useWindowUrlDrop,
  type OverlayKind,
} from './features/shell';
import { useAuth } from './auth';
import { loadCloudLibrary, saveCloudLibrary } from './cloud';
import { loadLocalLibrary, saveLocalLibrary } from './storage';
import { applyTheme, defaultSettings } from './themes';
import {
  applySeedRestore,
  RecoveryDialog,
  shouldConfirmSeedRestore,
  shouldRestoreAuthenticatedSession,
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
import {
  applyCollectionLibraryResult,
  buildComposePreview,
  cancelCompose,
  CollectionFormDialog,
  ComposePreviewDialog,
  confirmComposeCollection,
  DeleteCollectionDialog,
  parseComposeDragPayload,
  runCreateCollection,
  runDeleteCollection,
  runSetMembership,
  runUpdateCollection,
  toggleComposeSelection,
  type CollectionFormValues,
  type ComposePreview,
} from './features/collections';
import {
  applyTagLibraryResult,
  runAcceptSuggestedTag,
  runAddTagToBookmark,
  runCreateTag,
  runRemoveTagFromBookmark,
} from './features/tags';
import { createBrowserStorageAdapters } from './services/storage';
import { normalizeBookmarkUrl } from './domain/commands';
import {
  clearBookmarkFilters,
  filterBookmarks,
  type SortKey,
} from './domain/query';
import { collectCategorySubtreeIds } from './domain/categories';
import { openExternalUrl } from './features/bookmarks/external-url';

export default function App() {
  const auth = useAuth();
  const startup = useLocalStartup(auth.loading);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(seedBookmarks);
  const [cats, setCats] = useState<Category[]>(seedCategories);
  const [cols, setCols] = useState<Collection[]>(seedCollections);
  const [tagList, setTagList] = useState<Tag[]>(seedTags);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const settings = startup.settings ?? defaultSettings;
  const setSettings = startup.setSettings;
  const authed = startup.view === 'main';

  // REQ-001-AC-004：恢复已有 Supabase session 后直接进入主界面。
  const sessionMode = startup.sessionMode;
  const markAuthenticated = startup.markAuthenticated;
  useEffect(() => {
    if (shouldRestoreAuthenticatedSession(auth.session, sessionMode)) {
      markAuthenticated();
    }
  }, [auth.session, sessionMode, markAuthenticated]);

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
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloudConflictOpen, setCloudConflictOpen] = useState(false);
  const [cloudConflictRevision, setCloudConflictRevision] = useState<number | null>(null);
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false);
  const [draftBaseRevision, setDraftBaseRevision] = useState<number | null>(null);
  const [draftCloudRevision, setDraftCloudRevision] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null);
  const [categoryRecursiveConfirm, setCategoryRecursiveConfirm] = useState(false);
  const [categoryMoveId, setCategoryMoveId] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState<
    null | { mode: 'create' } | { mode: 'edit'; id: string }
  >(null);
  const [collectionDeleteId, setCollectionDeleteId] = useState<string | null>(null);
  const [composeSelectedIds, setComposeSelectedIds] = useState<string[]>([]);
  const [composePreview, setComposePreview] = useState<ComposePreview | null>(null);
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
    // E2E / 启动：检查 dirty cloud draft 与测试用冲突入口。
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('e2eCloudConflict') === '1') {
        setCloudConflictOpen(true);
        setCloudConflictRevision(Number(params.get('e2eCloudRevision') ?? '7'));
      }
      const draftRaw = localStorage.getItem('linkit.cloud-draft.v1');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw) as {
          dirty?: boolean;
          baseRevision?: number;
          cloudRevision?: number;
        };
        if (draft.dirty) {
          setDraftRecoveryOpen(true);
          setDraftBaseRevision(typeof draft.baseRevision === 'number' ? draft.baseRevision : null);
          setDraftCloudRevision(typeof draft.cloudRevision === 'number' ? draft.cloudRevision : null);
        }
      }
    } catch {
      // 忽略损坏的草稿探测，不阻断启动。
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
    // REQ-012-AC-003 / REQ-026-AC-003：详情操作同步两侧成员引用。
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark) return;
    const member = !bookmark.collectionIds.includes(collectionId);
    const result = runSetMembership({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      bookmarkId,
      collectionId,
      member,
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCollectionLibraryResult(result.value, bookmarks);
    setBookmarks(applied.bookmarks);
    setCols(applied.collections);
  }, [bookmarks, cats, cols, flashToast, tagList]);

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
    // REQ-012-AC-003：拖入主题时同步 Collection.bookmarkIds 与 Bookmark.collectionIds。
    const result = runSetMembership({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      bookmarkId,
      collectionId,
      member: true,
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCollectionLibraryResult(result.value, bookmarks);
    setBookmarks(applied.bookmarks);
    setCols(applied.collections);
    const col = applied.collections.find((c) => c.id === collectionId);
    flashToast(`已加入主题「${col?.name ?? ''}」`);
  }, [bookmarks, cats, cols, flashToast, tagList]);

  const acceptAICollection = useCallback((ids: string[]) => {
    if (state.selection.kind !== 'collection') return;
    const colId = state.selection.id;
    let nextBookmarks = bookmarks;
    let nextCols = cols;
    for (const bookmarkId of ids) {
      const result = runSetMembership({
        bookmarks: nextBookmarks,
        categories: cats,
        collections: nextCols,
        tags: tagList,
        bookmarkId,
        collectionId: colId,
        member: true,
      });
      if (!result.ok) continue;
      const applied = applyCollectionLibraryResult(result.value, nextBookmarks);
      nextBookmarks = applied.bookmarks;
      nextCols = applied.collections;
    }
    setBookmarks(nextBookmarks);
    setCols(nextCols);
    flashToast(`已将 ${ids.length} 项加入主题`);
  }, [bookmarks, cats, cols, flashToast, state.selection, tagList]);

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

  const handleSaveCollection = useCallback((values: CollectionFormValues) => {
    // REQ-012-AC-001：创建或编辑主题后刷新侧栏并持久化。
    if (!collectionForm) return;
    const entities = {
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
    };
    const result =
      collectionForm.mode === 'create'
        ? runCreateCollection({ ...entities, ...values })
        : runUpdateCollection({ ...entities, id: collectionForm.id, ...values });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCollectionLibraryResult(result.value, bookmarks);
    setCols(applied.collections);
    setBookmarks(applied.bookmarks);
    setCollectionForm(null);
    flashToast(collectionForm.mode === 'create' ? 'Collection created' : 'Collection saved');
  }, [bookmarks, cats, cols, collectionForm, flashToast, tagList]);

  const confirmDeleteCollection = useCallback(() => {
    // REQ-012-AC-002：确认删除主题但保留成员书签。
    if (!collectionDeleteId) return;
    const result = runDeleteCollection({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
      id: collectionDeleteId,
    });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCollectionLibraryResult(result.value, bookmarks);
    setCols(applied.collections);
    setBookmarks(applied.bookmarks);
    if (state.selection.kind === 'collection' && state.selection.id === collectionDeleteId) {
      setState((s) => ({ ...s, selection: { kind: 'all' } }));
    }
    setCollectionDeleteId(null);
    flashToast('Collection deleted');
  }, [bookmarks, cats, cols, collectionDeleteId, flashToast, state.selection, tagList]);

  const openComposePreview = useCallback((bookmarkIds: string[]) => {
    // REQ-013-AC-001：仅构建预览，确认前不写库。
    const domainBookmarks = toCategoryLibrary({
      bookmarks,
      categories: cats,
      collections: cols,
      tags: tagList,
    }).bookmarks;
    const preview = buildComposePreview(bookmarkIds, domainBookmarks);
    if ('ok' in preview && preview.ok === false) {
      flashToast(preview.error.message);
      return;
    }
    setComposePreview(preview as ComposePreview);
  }, [bookmarks, cats, cols, flashToast, tagList]);

  const handleComposeDrop = useCallback((rawPayload: string) => {
    const ids = parseComposeDragPayload(rawPayload);
    openComposePreview(ids.length >= 2 ? ids : composeSelectedIds.length >= 2 ? composeSelectedIds : ids);
  }, [composeSelectedIds, openComposePreview]);

  const handleConfirmCompose = useCallback((values: {
    name: string;
    emoji: string;
    description: string;
  }) => {
    // REQ-013-AC-002：确认后一次创建主题与全部成员。
    if (!composePreview) return;
    const result = confirmComposeCollection(
      toCategoryLibrary({
        bookmarks,
        categories: cats,
        collections: cols,
        tags: tagList,
      }),
      {
        name: values.name,
        emoji: values.emoji,
        description: values.description,
        bookmarkIds: composePreview.bookmarkIds,
      }
    );
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    const applied = applyCollectionLibraryResult(result.value, bookmarks);
    setCols(applied.collections);
    setBookmarks(applied.bookmarks);
    setComposePreview(null);
    setComposeSelectedIds([]);
    flashToast('Collection created');
  }, [bookmarks, cats, cols, composePreview, flashToast, tagList]);

  const handleCancelCompose = useCallback(() => {
    // REQ-013-AC-001：取消不产生持久化副作用。
    cancelCompose();
    setComposePreview(null);
  }, []);

  const entities = useCallback(
    () => ({ bookmarks, categories: cats, collections: cols, tags: tagList }),
    [bookmarks, cats, cols, tagList]
  );

  const applyTagResult = useCallback(
    (result: Parameters<typeof applyTagLibraryResult>[0]) => {
      const applied = applyTagLibraryResult(result, bookmarks);
      setTagList(applied.tags);
      setBookmarks(applied.bookmarks);
    },
    [bookmarks]
  );

  const handleAddTag = useCallback((tagId: string) => {
    // REQ-014-AC-002：详情添加标签后立即刷新书签与侧栏计数。
    if (!selectedBookmark) return;
    const result = runAddTagToBookmark({ ...entities(), bookmarkId: selectedBookmark.id, tagId });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    applyTagResult(result.value);
  }, [applyTagResult, entities, flashToast, selectedBookmark]);

  const handleRemoveTag = useCallback((tagId: string) => {
    // REQ-014-AC-002：详情移除标签后立即刷新筛选相关状态。
    if (!selectedBookmark) return;
    const result = runRemoveTagFromBookmark({ ...entities(), bookmarkId: selectedBookmark.id, tagId });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    applyTagResult(result.value);
  }, [applyTagResult, entities, flashToast, selectedBookmark]);

  const handleAcceptSuggestedTag = useCallback((tagId: string) => {
    // REQ-014-AC-003：采纳建议标签且不重复。
    if (!selectedBookmark) return;
    const result = runAcceptSuggestedTag({ ...entities(), bookmarkId: selectedBookmark.id, tagId });
    if (!result.ok) {
      flashToast(result.error.message);
      return;
    }
    applyTagResult(result.value);
  }, [applyTagResult, entities, flashToast, selectedBookmark]);

  const handleCreateTag = useCallback((label: string) => {
    // REQ-014-AC-002：不存在则创建后加入当前书签。
    if (!selectedBookmark) return;
    const created = runCreateTag({ ...entities(), label });
    if (!created.ok) {
      // 重名时尝试直接加入已有标签
      const existing = tagList.find(
        (tag) => tag.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase()
      );
      if (existing) {
        handleAddTag(existing.id);
        return;
      }
      flashToast(created.error.message);
      return;
    }
    const newTag = created.value.tags.find(
      (tag) => tag.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase()
    );
    const withTag = applyTagLibraryResult(created.value, bookmarks);
    setTagList(withTag.tags);
    setBookmarks(withTag.bookmarks);
    if (newTag) {
      const added = runAddTagToBookmark({
        bookmarks: withTag.bookmarks,
        categories: cats,
        collections: cols,
        tags: withTag.tags,
        bookmarkId: selectedBookmark.id,
        tagId: newTag.id,
      });
      if (added.ok) {
        applyTagResult(added.value);
      }
    }
  }, [applyTagResult, bookmarks, cats, cols, entities, flashToast, handleAddTag, selectedBookmark, tagList]);

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
    document.documentElement.lang = s.locale ?? 'en';
    await persistUiSettings(s);
    flashToast(s.locale === 'zh' ? '设置已保存' : 'Settings saved');
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

  /* ---------- keyboard shortcuts / Esc / URL drop ---------- */
  const shortcutHandlers = useMemo(
    () => ({
      onSpotlight: () => setSpotlightOpen(true),
      onNewBookmark: () => {
        setNewUrl('');
        setNewOpen(true);
      },
      onInsights: () => setInsightsOpen(true),
      onSettings: () => setSettingsOpen(true),
      onDensity: (density: ViewDensity) => setState((s) => ({ ...s, density })),
      onToggleSidebar: () => setSidebarOpen((v) => !v),
    }),
    []
  );
  useGlobalShortcuts(shortcutHandlers);

  const overlayOpen = useMemo(
    () => ({
      'seed-confirm': seedConfirmOpen,
      'delete-bookmark': Boolean(deleteTargetId),
      'delete-category': Boolean(categoryDeleteId),
      'delete-collection': Boolean(collectionDeleteId),
      'category-form': categoryFormOpen,
      'category-move': Boolean(categoryMoveId),
      'collection-form': Boolean(collectionForm),
      compose: Boolean(composePreview),
      spotlight: spotlightOpen,
      'new-bookmark': newOpen,
      insights: insightsOpen,
      health: healthOpen,
      settings: settingsOpen,
    }),
    [
      seedConfirmOpen,
      deleteTargetId,
      categoryDeleteId,
      collectionDeleteId,
      categoryFormOpen,
      categoryMoveId,
      collectionForm,
      composePreview,
      spotlightOpen,
      newOpen,
      insightsOpen,
      healthOpen,
      settingsOpen,
    ]
  );

  const closeOverlay = useCallback((kind: OverlayKind) => {
    switch (kind) {
      case 'seed-confirm':
        setSeedConfirmOpen(false);
        break;
      case 'delete-bookmark':
        setDeleteTargetId(null);
        break;
      case 'delete-category':
        setCategoryDeleteId(null);
        setCategoryRecursiveConfirm(false);
        break;
      case 'delete-collection':
        setCollectionDeleteId(null);
        break;
      case 'category-form':
        setCategoryFormOpen(false);
        break;
      case 'category-move':
        setCategoryMoveId(null);
        break;
      case 'collection-form':
        setCollectionForm(null);
        break;
      case 'compose':
        cancelCompose();
        setComposePreview(null);
        break;
      case 'spotlight':
        setSpotlightOpen(false);
        break;
      case 'new-bookmark':
        setNewOpen(false);
        setNewUrl('');
        break;
      case 'insights':
        setInsightsOpen(false);
        break;
      case 'health':
        setHealthOpen(false);
        break;
      case 'settings':
        setSettingsOpen(false);
        break;
    }
  }, []);

  useEscapeOverlayStack(overlayOpen, closeOverlay);

  const openNewFromDroppedUrl = useCallback((url: string) => {
    setNewUrl(url);
    setNewOpen(true);
  }, []);
  useWindowUrlDrop(openNewFromDroppedUrl);

  // 拖入高亮：仅用于视觉反馈，与入库逻辑分离。
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (!types) return;
      if (types.includes('text/uri-list') || types.includes('text/plain')) {
        setDragActive(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragActive(false);
    };
    const onDrop = () => setDragActive(false);
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
        loading={authSubmitting || auth.loading}
        error={auth.error}
        emailConfirmationRequired={emailConfirmationRequired}
        locale={settings.locale ?? 'en'}
        onSignIn={async (email, password) => {
          setEmailConfirmationRequired(false);
          setAuthSubmitting(true);
          try {
            const { error } = await auth.signIn(email, password);
            // REQ-001-AC-001 / REQ-001-AC-003
            if (!error) startup.markAuthenticated();
          } finally {
            setAuthSubmitting(false);
          }
        }}
        onSignUp={async (email, password) => {
          setEmailConfirmationRequired(false);
          setAuthSubmitting(true);
          try {
            const { error, result } = await auth.signUp(email, password);
            if (error || !result) return;
            // REQ-001-AC-002：有 session 进主界面；REQ-001-AC-006：无 session 显示 Check your email。
            if (result.status === 'authenticated') {
              startup.markAuthenticated();
              return;
            }
            setEmailConfirmationRequired(true);
          } finally {
            setAuthSubmitting(false);
          }
        }}
        onUseLocal={() => {
          void startup.enterLocalMode(settings);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen workspace flex items-center justify-center p-0 md:p-6 overflow-hidden">
      <AppShell
        syncing={syncing}
        sidebarOpen={sidebarOpen}
        detailOpen={detailOpen}
        chrome={{
          onSpotlight: () => setSpotlightOpen(true),
          onNew: () => {
            setNewUrl('');
            setNewOpen(true);
          },
          onSettings: () => setSettingsOpen(true),
          user: auth.user ? { email: auth.user.email ?? '' } : null,
          storageMode: settings.storageMode,
          locale: settings.locale ?? 'en',
          sidebarOpen,
          detailOpen,
          onToggleSidebar: () => setSidebarOpen((v) => !v),
          onToggleDetail: () => setDetailOpen((v) => !v),
        }}
        sidebar={
          <Sidebar
            categories={cats}
            collections={cols}
            tags={tagList}
            bookmarks={bookmarks}
            selection={state.selection}
            expanded={state.expandedCategories}
            onToggleExpand={(id) =>
              setState((s) => ({
                ...s,
                expandedCategories: {
                  ...s.expandedCategories,
                  [id]: !(s.expandedCategories[id] ?? false),
                },
              }))
            }
            onSelect={(sel: Selection) =>
              setState((s) => ({ ...s, selection: sel, filters: emptyFilters }))
            }
            onDropToCategory={(categoryId, bookmarkId) => moveToCategory(bookmarkId, categoryId)}
            onDropToCollection={(collectionId, bookmarkId) =>
              addToCollection(bookmarkId, collectionId)
            }
            onOpenInsights={() => setInsightsOpen(true)}
            onNewBookmark={() => {
              setNewUrl('');
              setNewOpen(true);
            }}
            onNewCategory={() => setCategoryFormOpen(true)}
            onDeleteCategory={requestDeleteCategory}
            onMoveCategory={(categoryId, newParentId) =>
              handleMoveCategory(categoryId, newParentId)
            }
            onRequestMoveCategory={(categoryId) => setCategoryMoveId(categoryId)}
            onNewCollection={() => setCollectionForm({ mode: 'create' })}
            onEditCollection={(id) => setCollectionForm({ mode: 'edit', id })}
            onDeleteCollection={(id) => setCollectionDeleteId(id)}
            onDropToCompose={handleComposeDrop}
            insightCount={insights.length}
          />
        }
        content={
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
            composeSelectedIds={composeSelectedIds}
            sort={sortKey}
            onSort={(next) => setSortKey(next as SortKey)}
            onDensity={(d: ViewDensity) => setState((s) => ({ ...s, density: d }))}
            onSearch={(q) => setFilters({ query: q })}
            onOpenSpotlight={() => setSpotlightOpen(true)}
            onSelectBookmark={(id) => setState((s) => ({ ...s, selectedBookmarkId: id }))}
            onToggleComposeSelect={(id, additive) => {
              setComposeSelectedIds((prev) => toggleComposeSelection(prev, id, additive));
            }}
            onRequestCompose={() => openComposePreview(composeSelectedIds)}
            onToggleStar={toggleStar}
            onClearTagFilter={(id) =>
              setFilters({ tagIds: state.filters.tagIds.filter((t) => t !== id) })
            }
            onDateRange={(r) => setFilters({ dateRange: r })}
            onToggleStarredFilter={() =>
              setFilters({ onlyStarred: !state.filters.onlyStarred })
            }
            onReadStatusFilter={(status) => setFilters({ readStatus: status })}
            onClearFilters={() => {
              const cleared = clearBookmarkFilters();
              setFilters({ ...emptyFilters, ...cleared, query: '' });
            }}
            onAcceptAICollection={acceptAICollection}
            onDismissAICollection={() => {}}
            onNewBookmark={() => {
              setNewUrl('');
              setNewOpen(true);
            }}
            onDragStartBookmark={() => {}}
          />
        }
        detail={
          <DetailPanel
            bookmark={selectedBookmark}
            tags={tagList}
            categories={cats}
            collections={cols}
            onUpdate={(patch) => selectedBookmark && updateBookmark(selectedBookmark.id, patch)}
            onToggleStar={() => selectedBookmark && toggleStar(selectedBookmark.id)}
            onTogglePin={() => selectedBookmark && togglePin(selectedBookmark.id)}
            onToggleCollection={(cid) =>
              selectedBookmark && toggleCollection(selectedBookmark.id, cid)
            }
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onAcceptSuggestedTag={handleAcceptSuggestedTag}
            onCreateTag={handleCreateTag}
            onVisit={() => {
              void handleVisit();
            }}
            onOpenHealth={() => setHealthOpen(true)}
            onReanalyze={() => setReanalyzeOpen(true)}
            onDelete={() => selectedBookmark && requestDeleteBookmark(selectedBookmark.id)}
            onClose={() => setState((s) => ({ ...s, selectedBookmarkId: null }))}
          />
        }
      />

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
        onNewFromUrl={(url) => {
          // 先写入 URL 再打开对话框，避免空 initialUrl 竞态。
          setSpotlightOpen(false);
          setNewUrl(url);
          setNewOpen(true);
        }}
      />
      <NewBookmarkDialog
        open={newOpen}
        initialUrl={newUrl}
        categories={cats}
        tags={tagList}
        collections={cols}
        aiContext={
          settings.ai?.apiBase && settings.ai?.model
            ? {
                apiBase: settings.ai.apiBase,
                model: settings.ai.model,
                locale: settings.locale === 'zh' ? 'zh' : 'en',
              }
            : null
        }
        onClose={() => {
          setNewOpen(false);
          setNewUrl('');
        }}
        onCreate={createBookmark}
      />
      <ReanalyzeBookmarkDialog
        open={reanalyzeOpen}
        bookmark={selectedBookmark}
        tags={tagList}
        categories={cats}
        aiContext={
          settings.ai?.apiBase && settings.ai?.model
            ? {
                apiBase: settings.ai.apiBase,
                model: settings.ai.model,
                locale: settings.locale === 'zh' ? 'zh' : 'en',
              }
            : null
        }
        onClose={() => setReanalyzeOpen(false)}
        onApply={(patch) => {
          if (selectedBookmark) {
            updateBookmark(selectedBookmark.id, patch);
          }
        }}
        onCreateTag={(label) => {
          const existing = tagList.find(
            (tag) => tag.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase()
          );
          if (existing) {
            return existing.id;
          }
          const created = runCreateTag({ ...entities(), label });
          if (!created.ok) {
            return null;
          }
          const withTag = applyTagLibraryResult(created.value, bookmarks);
          setTagList(withTag.tags);
          setBookmarks(withTag.bookmarks);
          const newTag = created.value.tags.find(
            (tag) => tag.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase()
          );
          return newTag?.id ?? null;
        }}
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
      {collectionForm && (
        <CollectionFormDialog
          mode={collectionForm.mode}
          initial={
            collectionForm.mode === 'edit'
              ? (() => {
                  const current = cols.find((c) => c.id === collectionForm.id);
                  return current
                    ? {
                        name: current.name,
                        emoji: current.emoji,
                        color: current.color,
                        description: current.description,
                      }
                    : undefined;
                })()
              : undefined
          }
          onCancel={() => setCollectionForm(null)}
          onSubmit={handleSaveCollection}
        />
      )}
      {collectionDeleteId && (
        <DeleteCollectionDialog
          name={cols.find((c) => c.id === collectionDeleteId)?.name ?? 'Collection'}
          memberCount={cols.find((c) => c.id === collectionDeleteId)?.bookmarkIds.length ?? 0}
          onCancel={() => setCollectionDeleteId(null)}
          onConfirm={confirmDeleteCollection}
        />
      )}
      {composePreview && (
        <ComposePreviewDialog
          members={composePreview.members}
          onCancel={handleCancelCompose}
          onConfirm={handleConfirmCompose}
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
      <CloudConflictDialog
        open={cloudConflictOpen}
        cloudRevision={cloudConflictRevision}
        onCancel={() => {
          // Cancel：保持冲突对话框可再次打开的暂停语义；此处仅关闭 UI，不改库。
          setCloudConflictOpen(false);
        }}
        onUseCloudCopy={() => setCloudConflictOpen(false)}
        onOverwriteCloud={() => setCloudConflictOpen(false)}
      />
      <CloudDraftRecoveryDialog
        open={draftRecoveryOpen}
        baseRevision={draftBaseRevision}
        cloudRevision={draftCloudRevision}
        onCancel={() => setDraftRecoveryOpen(false)}
        onKeepDraft={() => setDraftRecoveryOpen(false)}
        onDiscard={() => {
          localStorage.removeItem('linkit.cloud-draft.v1');
          setDraftRecoveryOpen(false);
        }}
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

