export type ViewDensity =
  | 'card'
  | 'list'
  | 'masonry'
  | 'timeline'
  | 'tag-aggregation'
  | 'theme-space';

export type TagColor = 'blue' | 'green' | 'amber' | 'coral' | 'violet' | 'gray';

export interface Tag {
  id: string;
  label: string;
  color: TagColor;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
  parentId: string | null;
  color?: TagColor;
  count?: number;
}

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  color: TagColor;
  description: string;
  bookmarkIds: string[];
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon: string; // emoji or letter glyph used in favicon slot
  faviconColor: TagColor;
  description: string;
  notes: string;
  tags: string[]; // tag ids
  categoryId: string;
  collectionIds: string[];
  createdAt: string; // ISO
  lastVisitedAt: string | null;
  visitCount: number;
  starred: boolean;
  pinned: boolean;
  /** 阅读状态；缺省按 unread 处理。REQ-008-AC-003 */
  readStatus?: 'unread' | 'reading' | 'read' | 'archived';
  thumbnail?: string; // gradient key for preview
  health?: 'ok' | 'changed' | 'broken';
  aiSummary?: string;
  aiSuggestedTags?: string[];
  spark?: number[]; // visit history
}

export interface AIInsight {
  id: string;
  type: 'trend' | 'collection' | 'stale' | 'summary';
  icon: string;
  title: string;
  detail: string;
  action?: string;
  accent: TagColor;
}

export interface SemanticResult {
  bookmarkId: string;
  score: number; // 0..1
  reason: string;
}

export type StorageMode = 'local' | 'cloud';

export type ThemeId = 'midnight' | 'ocean' | 'graphite' | 'sunset';

export interface AISettings {
  apiBase: string;
  model: string;
  apiKey: string;
}

export interface AppSettings {
  storageMode: StorageMode;
  theme: ThemeId;
  ai: AISettings;
}

export interface LibraryData {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
}
