import type { UiSize } from '../../config/window-size';

/**
 * 桌面端优先调用 Go platform.SetMainWindowSize；浏览器环境忽略。
 * REQ-031-AC-003
 */
export async function setMainWindowSize(uiSize: UiSize): Promise<void> {
  const binder = (
    window as unknown as {
      go?: {
        platform?: {
          Service?: {
            SetMainWindowSize?: (request: { uiSize: string }) => Promise<void>;
          };
        };
      };
    }
  ).go?.platform?.Service?.SetMainWindowSize;
  if (!binder) {
    return;
  }
  await binder({ uiSize });
}
