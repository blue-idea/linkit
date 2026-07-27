export const VIEW_MODE_IDS = [
  'card',
  'list',
  'masonry',
  'timeline',
  'tag-aggregation',
  'theme-space',
] as const;

export type ViewMode = (typeof VIEW_MODE_IDS)[number];
