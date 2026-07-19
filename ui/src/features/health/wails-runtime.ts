type WailsRuntime = {
  EventsOnMultiple?: (
    eventName: string,
    callback: (payload: unknown) => void,
    maxCallbacks: number
  ) => () => void;
};

function getRuntime(): WailsRuntime | null {
  return (window as typeof window & { runtime?: WailsRuntime }).runtime ?? null;
}

/**
 * 通过运行时对象订阅 Wails 事件，避免静态导入被 .gitignore 忽略的 wailsjs 生成物。
 * REQ-022-AC-003
 */
export function subscribeWailsEvent<TPayload>(
  eventName: string,
  callback: (payload: TPayload) => void
): () => void {
  const eventsOnMultiple = getRuntime()?.EventsOnMultiple;
  if (!eventsOnMultiple) return () => {};
  return eventsOnMultiple(eventName, callback as (payload: unknown) => void, -1);
}
