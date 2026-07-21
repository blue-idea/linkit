/**
 * 桌面端优先调用 Go platform.SetToggleWindowHotkey；浏览器环境忽略。
 * REQ-030-AC-007
 */
export async function setToggleWindowHotkey(accelerator: string): Promise<void> {
  const binder = (
    window as unknown as {
      go?: {
        platform?: {
          Service?: {
            SetToggleWindowHotkey?: (request: { accelerator: string }) => Promise<void>;
          };
        };
      };
    }
  ).go?.platform?.Service?.SetToggleWindowHotkey;
  if (!binder) {
    return;
  }
  await binder({ accelerator });
}
