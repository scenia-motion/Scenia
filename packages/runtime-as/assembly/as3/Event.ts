export class Event {
  static readonly ENTER_FRAME: string = "enterFrame";

  type: string;
  deltaTime: f32;
  bubbles: bool = false;
  target: EventDispatcher | null = null;
  currentTarget: EventDispatcher | null = null;

  constructor(type: string, deltaTime: f32 = 0) {
    this.type = type;
    this.deltaTime = deltaTime;
  }
}

export class PointerEvent extends Event {
  static readonly POINTER_DOWN: string = "pointerDown";
  static readonly POINTER_UP: string = "pointerUp";
  static readonly POINTER_MOVE: string = "pointerMove";

  stageX: f32;
  stageY: f32;
  localX: f32;
  localY: f32;

  constructor(type: string, stageX: f32, stageY: f32, localX: f32, localY: f32) {
    super(type, 0);
    this.bubbles = true;
    this.stageX = stageX;
    this.stageY = stageY;
    this.localX = localX;
    this.localY = localY;
  }
}

export type EventListener = (this: EventDispatcher, event: Event) => void;

class ListenerEntry {
  type: string;
  listener: EventListener;

  constructor(type: string, listener: EventListener) {
    this.type = type;
    this.listener = listener;
  }
}

export class EventDispatcher {
  private listeners: Array<ListenerEntry> = new Array<ListenerEntry>();

  protected bubbleParent(): EventDispatcher | null {
    return null;
  }

  addEventListener<T extends EventDispatcher>(type: string, listener: (this: T, event: Event) => void): void {
    this.listeners.push(new ListenerEntry(type, changetype<EventListener>(listener)));
  }

  removeEventListener<T extends EventDispatcher>(type: string, listener: (this: T, event: Event) => void): void {
    let storedListener = changetype<EventListener>(listener);
    for (let i = this.listeners.length - 1; i >= 0; i--) {
      let entry = this.listeners[i];
      if (entry.type == type && entry.listener == storedListener) {
        this.listeners.splice(i, 1);
      }
    }
  }

  private notifyListeners(event: Event): void {
    let snapshot = this.listeners.slice(0);
    for (let i = 0; i < snapshot.length; i++) {
      let entry = snapshot[i];
      if (entry.type == event.type) {
        entry.listener.call(this, event);
      }
    }
  }

  dispatchEvent(event: Event): void {
    if (event.target == null) {
      event.target = this;
    }

    event.currentTarget = this;
    this.notifyListeners(event);

    if (event.bubbles) {
      let ancestor = this.bubbleParent();
      while (ancestor != null) {
        event.currentTarget = ancestor;
        ancestor.notifyListeners(event);
        ancestor = ancestor.bubbleParent();
      }
    }
  }
}
