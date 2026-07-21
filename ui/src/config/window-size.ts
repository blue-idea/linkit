export type UiSize = 'small' | 'medium' | 'large' | 'xlarge';

export const UI_SIZE_IDS = ['small', 'medium', 'large', 'xlarge'] as const satisfies readonly UiSize[];

/** 窗口大小预设；与 config/window_size.go 及 data.md 对齐。REQ-031 */
export const UI_SIZE_PRESETS: Record<UiSize, { width: number; height: number }> = {
  small: { width: 1152, height: 720 },
  medium: { width: 1280, height: 800 },
  large: { width: 1536, height: 960 },
  xlarge: { width: 1792, height: 1120 },
};

export const DEFAULT_UI_SIZE: UiSize = 'medium';

export function resolveWindowSize(uiSize: UiSize): { width: number; height: number } {
  return UI_SIZE_PRESETS[uiSize];
}

export function isUiSize(value: unknown): value is UiSize {
  return typeof value === 'string' && (UI_SIZE_IDS as readonly string[]).includes(value);
}
