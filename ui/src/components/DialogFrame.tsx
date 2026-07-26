import type { ReactNode } from 'react';

type DialogFrameProps = {
  children: ReactNode;
  containerClassName?: string;
  backdropClassName?: string;
  dialogClassName: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
};

/**
 * 统一弹窗骨架：只负责遮罩与内容分层，不再支持点击 backdrop 关闭。
 */
export function DialogFrame({
  children,
  containerClassName = 'fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in',
  backdropClassName = 'bg-black/50 backdrop-blur-[3px]',
  dialogClassName,
  ariaLabel,
  ariaLabelledby,
}: DialogFrameProps) {
  return (
    <div className={containerClassName} role="presentation">
      <div className={`absolute inset-0 ${backdropClassName}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={`relative ${dialogClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
