import { THEME_IDS } from './config/themes';
import type { UiSize } from './config/window-size';

export type { UiSize };

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
  healthCheckedAt?: string | null;
  healthHttpStatus?: number | null;
  healthFingerprint?: string | null;
  healthErrorCode?: string | null;
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

export type ThemeId = (typeof THEME_IDS)[number];

/** UI 语言偏好；与 domain AppSettings.locale 对齐。 */
export type UiLocale = 'en' | 'zh';

export interface AISettings {
  apiBase: string;
  model: string;
}

export interface AIConsentRecord {
  apiBase: string;
  grantedAt: string;
}

export interface AppSettings {
  storageMode: StorageMode;
  theme: ThemeId;
  /** 界面语言；缺省按 en 处理。覆盖 REQ-023-AC-004。 */
  locale: UiLocale;
  ai: AISettings;
  /** 本机 AI 数据发送授权；与当前 apiBase 匹配才有效。 */
  aiConsent?: AIConsentRecord | null;
  /** 可配置快捷键；缺省使用平台默认。REQ-030 */
  shortcuts?: Partial<Record<string, string>>;
  /** 主窗口大小档位；缺省 medium。REQ-031 */
  uiSize?: UiSize;
}

export interface LibraryData {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
}
