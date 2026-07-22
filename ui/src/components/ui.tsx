import { useEffect, useState, type ReactNode } from 'react';
import type { TagColor } from '../types';
import { tagColors } from '../colors';
import { resolveThumbnailGradient } from '../config/thumbnail-gradients';
import { iconComponents, type IconName } from '../config/icons';
import { useI18n } from '../i18n/use-i18n';

/* ---------- Icon helper ---------- */
export function Icon({ name, size = 16, className = '', strokeWidth = 2, fill = 'none' }: { name: string; size?: number; className?: string; strokeWidth?: number; fill?: string }) {
  const C = iconComponents[name as IconName] ?? iconComponents.Circle;
  return <C size={size} className={className} strokeWidth={strokeWidth} fill={fill} />;
}

/* ---------- Tag pill ---------- */
export function TagPill({
  label,
  color = 'gray',
  size = 'sm',
  onClick,
  onRemove,
  active,
  className = '',
}: {
  label: string;
  color?: TagColor;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  onRemove?: () => void;
  active?: boolean;
  className?: string;
}) {
  const i18n = useI18n();
  const c = tagColors[color];
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded-full border ${c.border} ${c.bg} ${c.text} ${sizes[size]} font-medium ${
        onClick ? 'cursor-pointer hover:brightness-125 transition' : ''
      } ${active ? 'ring-1 ring-white/20' : ''} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
      {onRemove && (
        <button
          type="button"
          aria-label={i18n.t('bookmark.removeTag', { label })}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-60 hover:opacity-100 focus-ring rounded-sm"
        >
          <Icon name="X" size={10} />
        </button>
      )}
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  'aria-label': ariaLabel,
}: {
  value: T;
  options: { value: T; icon?: string; label?: string; ariaLabel?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? 'View mode'}
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-800/70 hairline ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.ariaLabel ?? o.label ?? String(o.value)}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
            value === o.value
              ? 'bg-ink-600 text-ink-100 shadow-sm'
              : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700/60'
          }`}
        >
          {o.icon && <Icon name={o.icon} size={size === 'sm' ? 12 : 13} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, color = 'blue', width = 80, height = 24 }: { data: number[]; color?: TagColor; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((d, i) => `${(i * step).toFixed(1)},${(height - ((d - min) / range) * height).toFixed(1)}`);
  const c = tagColors[color];
  const id = `spark-${color}-${width}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" className={c.text} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={c.text} />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${id})`}
        stroke="none"
        className={c.text}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={c.text}
      />
    </svg>
  );
}

/* ---------- Favicon block ---------- */
export function Favicon({
  glyph,
  color,
  size = 32,
  className = '',
}: {
  glyph?: string | null;
  color?: TagColor | null;
  size?: number;
  className?: string;
}) {
  // 本机恢复数据可能缺少颜色；回退 blue，避免整个主界面白屏。
  const c = tagColors[color ?? 'blue'] ?? tagColors.blue;
  const raw = (glyph && String(glyph).trim()) || '?';
  const [displaySrc, setDisplaySrc] = useState(raw);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setDisplaySrc(raw);
    setImageFailed(false);
  }, [raw]);
  const isImage =
    /^https?:\/\//i.test(displaySrc) || /^data:image\//i.test(displaySrc);

  const handleImageError = () => {
    void (async () => {
      if (/^https?:\/\//i.test(displaySrc)) {
        const { fetchFaviconDataUrl } = await import('../features/bookmarks/metadata-client');
        const dataUrl = await fetchFaviconDataUrl(displaySrc);
        if (dataUrl) {
          setDisplaySrc(dataUrl);
          return;
        }
      }
      setImageFailed(true);
    })();
  };

  const textLabel = (() => {
    if (/^https?:\/\//i.test(raw)) {
      try {
        return new URL(raw).hostname.charAt(0).toUpperCase() || '?';
      } catch {
        return '?';
      }
    }
    if (/^data:image\//i.test(raw)) {
      return '?';
    }
    return raw;
  })();

  return (
    <div
      className={`rounded-[7px] bg-gradient-to-br ${c.gradFrom} ${c.gradTo} flex items-center justify-center text-white hairline shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {isImage && !imageFailed ? (
        <img
          src={displaySrc}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[7px]"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span className="drop-shadow-sm">{textLabel}</span>
      )}
    </div>
  );
}

/* ---------- Mini browser preview (mocked screenshot) ---------- */
export function MiniBrowser({
  domain,
  thumbnail,
  title,
  className = '',
  loading,
}: {
  domain: string;
  thumbnail?: string;
  title?: string;
  className?: string;
  loading?: boolean;
}) {
  const grad = resolveThumbnailGradient(thumbnail);
  return (
    <div className={`rounded-mac-lg overflow-hidden bg-ink-900 hairline ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ink-800/80 border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-coral-500/80" />
        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
        <span className="w-2 h-2 rounded-full bg-mint-500/80" />
        <div className="ml-2 flex-1 h-4 rounded bg-ink-700/70 text-[10px] text-ink-300 flex items-center px-2 gap-1.5">
          <Icon name="Lock" size={8} className="text-ink-400" />
          <span className="truncate">{domain}</span>
        </div>
      </div>
      <div className={`relative h-full min-h-[120px] bg-gradient-to-br ${grad}`}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 p-4 flex flex-col gap-2 opacity-90">
            <div className="h-3 w-2/3 rounded bg-white/40" />
            <div className="h-2 w-1/2 rounded bg-white/25" />
            <div className="mt-auto flex gap-2">
              <div className="h-6 w-20 rounded-md bg-white/30" />
              <div className="h-6 w-16 rounded-md bg-white/15" />
            </div>
            {title && <div className="absolute top-3 right-3 text-[10px] text-white/70 font-medium truncate max-w-[50%]">{title}</div>}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    </div>
  );
}

/* ---------- AI badge ---------- */
export function AIBadge({ label = 'AI', className = '' }: { label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-ink-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full ai-dot animate-ai-pulse" />
      {label}
    </span>
  );
}

/* ---------- Button ---------- */
export function Button({
  children,
  variant = 'ghost',
  size = 'md',
  icon,
  className = '',
  onClick,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
}: {
  children?: ReactNode;
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger';
  size?: 'sm' | 'md';
  icon?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}) {
  const variants = {
    primary: 'bg-accent-600 hover:bg-accent-500 text-white shadow-sm',
    ghost: 'text-ink-200 hover:text-ink-100 hover:bg-ink-700/60',
    subtle: 'bg-ink-700/60 hover:bg-ink-600 text-ink-100 hairline',
    danger: 'text-coral-400 hover:bg-coral-500/15',
  };
  const sizes = { sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5', md: 'text-sm px-3 py-2 rounded-lg gap-2' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-all focus-ring ${variants[variant]} ${sizes[size]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ---------- KBD ---------- */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-ink-700/80 text-[10px] text-ink-200 hairline font-mono">{children}</kbd>;
}

/* ---------- Animate-in wrapper ---------- */
export function AnimateIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`animate-slide-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
