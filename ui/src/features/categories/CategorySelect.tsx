import { useEffect, useMemo, useRef, useState, useId } from 'react';
import type { Category } from '../../types';
import { useI18n } from '../../i18n/use-i18n';
import { buildCategoryTree } from './utils';
import { iconComponents } from '../../config/icons';

const { Check, ChevronDown, Folder } = iconComponents;

export interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 分类选择下拉组件
 * 提供支持层级展示、键盘交互、深浅主题自动适配的优雅下拉菜单
 */
export function CategorySelect({
  value,
  onChange,
  categories,
  ariaLabel,
  className = '',
  disabled = false,
}: CategorySelectProps) {
  const i18n = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // 全部可选项：包含「未分类」及各层级分类
  const options = useMemo(() => [
    { id: '', name: i18n.t('bookmark.uncategorized'), level: 0 },
    ...buildCategoryTree(categories),
  ], [categories, i18n]);

  // 当前选中的选项展示文本
  const currentOption = options.find((opt) => opt.id === value) || options[0];

  // 点击外部收起菜单
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 展开时重置键盘高亮项至当前选中项
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.id === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value, options]);

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          handleSelect(options[focusedIndex].id);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* 触发按钮：与设计系统输入框一致的圆角、质感及焦点样式 */}
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2 text-sm text-ink-100 outline-none focus-ring hover:bg-ink-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <Folder className="w-4 h-4 text-accent-500 shrink-0" />
          <span className="truncate">{currentOption.name}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ink-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 下拉弹出菜单：使用 ink-800/95 背景搭配毛玻璃与微阴影，完美融入深浅主题 */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto scroll-thin rounded-xl bg-ink-800/95 backdrop-blur-md hairline p-1.5 shadow-win"
        >
          {options.map((option, index) => {
            const isSelected = option.id === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={option.id || '__uncategorized__'}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setFocusedIndex(index)}
                style={{
                  paddingLeft: option.level > 0 ? `${12 + option.level * 16}px` : undefined,
                }}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-accent-500/15 text-accent-600 font-medium'
                    : isFocused
                      ? 'bg-ink-700/60 text-ink-100'
                      : 'text-ink-200 hover:bg-ink-700/40 hover:text-ink-100'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  {option.level > 0 && (
                    <span className="text-ink-400/60 font-mono text-[11px] shrink-0">└─</span>
                  )}
                  <Folder
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-accent-500' : 'text-ink-400 group-hover:text-accent-400'
                    }`}
                  />
                  <span className="truncate">{option.name}</span>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-accent-500 shrink-0 ml-2" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
