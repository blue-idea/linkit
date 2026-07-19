export type CollectionIconOption = {
  label: string;
  emoji: string;
};

/** Collection 主题图标候选，集中管理以供表单和后续入口复用。 */
export const COLLECTION_ICON_OPTIONS: CollectionIconOption[] = [
  { label: 'Books', emoji: '📚' },
  { label: 'Palette', emoji: '🎨' },
  { label: 'Tools', emoji: '🛠️' },
  { label: 'Lab', emoji: '🧪' },
  { label: 'Rocket', emoji: '🚀' },
  { label: 'Target', emoji: '🎯' },
  { label: 'Sparkles', emoji: '✨' },
  { label: 'Bookmark', emoji: '🔖' },
  { label: 'Globe', emoji: '🌐' },
  { label: 'Briefcase', emoji: '💼' },
  { label: 'Idea', emoji: '💡' },
  { label: 'Inbox', emoji: '📥' },
];
