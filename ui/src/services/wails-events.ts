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

/** 订阅 Wails 事件；浏览器环境无 runtime 时返回 no-op 取消函数。 */
export function subscribeWailsEvent<TPayload>(
  eventName: string,
  callback: (payload: TPayload) => void
): () => void {
  const eventsOnMultiple = getRuntime()?.EventsOnMultiple;
  if (!eventsOnMultiple) return () => {};
  return eventsOnMultiple(eventName, callback as (payload: unknown) => void, -1);
}
