import type { TagColor } from './types';

export { THUMBNAIL_GRADIENTS as thumbnailGradients } from './config/thumbnail-gradients';

export const tagColors: Record<TagColor, { dot: string; text: string; bg: string; border: string; soft: string; gradFrom: string; gradTo: string }> = {
  blue: {
    dot: 'bg-accent-500',
    text: 'text-accent-300',
    bg: 'bg-accent-500/15',
    border: 'border-accent-400/30',
    soft: 'bg-accent-500/10',
    gradFrom: 'from-accent-500',
    gradTo: 'to-accent-700',
  },
  green: {
    dot: 'bg-mint-500',
    text: 'text-mint-400',
    bg: 'bg-mint-500/15',
    border: 'border-mint-400/30',
    soft: 'bg-mint-500/10',
    gradFrom: 'from-mint-500',
    gradTo: 'to-mint-600',
  },
  amber: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/30',
    soft: 'bg-amber-500/10',
    gradFrom: 'from-amber-400',
    gradTo: 'to-amber-500',
  },
  coral: {
    dot: 'bg-coral-500',
    text: 'text-coral-400',
    bg: 'bg-coral-500/15',
    border: 'border-coral-400/30',
    soft: 'bg-coral-500/10',
    gradFrom: 'from-coral-400',
    gradTo: 'to-coral-500',
  },
  violet: {
    dot: 'bg-violet2-500',
    text: 'text-violet2-400',
    bg: 'bg-violet2-500/15',
    border: 'border-violet2-400/30',
    soft: 'bg-violet2-500/10',
    gradFrom: 'from-violet2-500',
    gradTo: 'to-violet2-400',
  },
  gray: {
    dot: 'bg-ink-300',
    text: 'text-ink-200',
    bg: 'bg-ink-500/30',
    border: 'border-ink-400/30',
    soft: 'bg-ink-500/20',
    gradFrom: 'from-ink-400',
    gradTo: 'to-ink-600',
  },
};
