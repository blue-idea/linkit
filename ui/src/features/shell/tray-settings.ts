import { APP_EVENTS } from '../../config/events';
import { subscribeWailsEvent } from '../../services/wails-events';

type EventSubscriber = (eventName: string, callback: () => void) => () => void;

/** 订阅原生托盘 Settings 动作，并返回取消订阅函数。REQ-030-AC-003 */
export function subscribeTraySettings(
  onOpenSettings: () => void,
  subscribe: EventSubscriber = subscribeWailsEvent
): () => void {
  return subscribe(APP_EVENTS.openSettings, onOpenSettings);
}
