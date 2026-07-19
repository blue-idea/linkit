import type { IconName } from './icons';

/**
 * 分类图标候选（受控白名单，集中管理）。
 * fix_task 1.2
 */
export const CATEGORY_ICON_CANDIDATES = [
  'Folder',
  'Bookmark',
  'BookOpen',
  'Library',
  'Tags',
  'Star',
  'Heart',
  'Home',
  'Inbox',
  'Archive',
  'Code2',
  'Terminal',
  'Cpu',
  'MonitorSmartphone',
  'Smartphone',
  'Server',
  'Database',
  'HardDrive',
  'Cloud',
  'Wifi',
  'Globe',
  'Link',
  'Palette',
  'PenTool',
  'Shapes',
  'Image',
  'Camera',
  'Film',
  'Type',
  'Droplet',
  'Layers',
  'LayoutGrid',
  'Boxes',
  'Package',
  'Puzzle',
  'Atom',
  'Beaker',
  'Brain',
  'Sparkles',
  'Lightbulb',
  'Gauge',
  'Rocket',
  'Zap',
  'Target',
  'Trophy',
  'Flag',
  'Compass',
  'Map',
  'Plane',
  'Mountain',
  'Leaf',
  'Coffee',
  'Music',
  'Headphones',
  'Mic',
  'Video',
  'Gamepad2',
  'Newspaper',
  'FileText',
  'Quote',
  'MessageSquare',
  'Radio',
  'Briefcase',
  'Building2',
  'ShoppingBag',
  'Wallet',
  'Gift',
  'GraduationCap',
  'Hammer',
  'Wrench',
  'Key',
  'Scale',
  'ScanSearch',
  'Hash',
  'Calendar',
  'Clock',
] as const satisfies readonly IconName[];

export type CategoryIconName = (typeof CATEGORY_ICON_CANDIDATES)[number];

/**
 * 分类图标颜色候选（与 TagColor / 侧栏着色一致）。
 * fix_task 1.2
 */
export const CATEGORY_COLOR_CANDIDATES = [
  'blue',
  'green',
  'amber',
  'coral',
  'violet',
  'gray',
] as const;

export type CategoryColorName = (typeof CATEGORY_COLOR_CANDIDATES)[number];

const iconCandidateSet = new Set<string>(CATEGORY_ICON_CANDIDATES);
const colorCandidateSet = new Set<string>(CATEGORY_COLOR_CANDIDATES);

export function listCategoryIconCandidates(): CategoryIconName[] {
  return [...CATEGORY_ICON_CANDIDATES];
}

export function isCategoryIconCandidate(icon: string): icon is CategoryIconName {
  return iconCandidateSet.has(icon);
}

export function listCategoryColorCandidates(): CategoryColorName[] {
  return [...CATEGORY_COLOR_CANDIDATES];
}

export function isCategoryColorCandidate(color: string): color is CategoryColorName {
  return colorCandidateSet.has(color);
}
