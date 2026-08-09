import { APP_EVENTS } from '../../config/events';
import { subscribeWailsEvent } from '../../services/wails-events';

type EventSubscriber = (eventName: string, callback: () => void) => () => void;

/** 订阅原生托盘 About 动作，并返回取消订阅函数。 */
export function subscribeTrayAbout(
  onOpenAbout: () => void,
  subscribe: EventSubscriber = subscribeWailsEvent
): () => void {
  return subscribe(APP_EVENTS.openAbout, onOpenAbout);
}
