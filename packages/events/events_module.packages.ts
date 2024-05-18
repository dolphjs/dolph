import EventEmitter from 'node:events';
import { Service } from 'typedi';
import { Listener } from '../../common';

@Service()
export class EventEmitterService extends EventEmitter {
  private listenerRegistry: Map<string, Listener[]> = new Map();

  constructor() {
    super();
  }

  emitEvent<T extends Array<any>>(eventName: string, ...args: T): boolean {
    let listeners = this.listenerRegistry.get(eventName) || [];
    let stopPropagation = false;

    for (const entry of listeners) {
      const result = entry.listener(...args);
      if (entry.once) {
        this.offEvent(eventName, entry.listener);
      }
      if (result === false) {
        stopPropagation = true;
        break;
      }
    }

    // Cleanup listeners marked for one-time use
    listeners = listeners.filter((listener) => !listener.once);
    this.listenerRegistry.set(eventName, listeners);

    return !stopPropagation;
  }

  onEvent<T extends (...args: any[]) => void | boolean>(
    eventName: string,
    listener: T,
    priority: number = 0,
    once: boolean = false,
  ): void {
    const listeners = this.listenerRegistry.get(eventName) || [];
    listeners.push({ listener, priority, once });
    listeners.sort((a, b) => b.priority - a.priority);
    this.listenerRegistry.set(eventName, listeners);
    if (once) {
      super.once(eventName, listener as (...args: any[]) => void);
    } else {
      super.on(eventName, listener as (...args: any[]) => void);
    }
  }

  onceEvent<T extends (...args: any[]) => void>(eventName: string, listener: T, priority: number = 0): void {
    this.onEvent(eventName, listener, priority, true);
  }

  offEvent<T extends (...args: any[]) => void>(eventName: string, listener: T): void {
    const listeners = this.listenerRegistry.get(eventName) || [];
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.listenerRegistry.set(eventName, listeners);
    }
    super.off(eventName, listener);
  }

  removeAllListenersForEvent(eventName: string): void {
    this.listenerRegistry.delete(eventName);
    super.removeAllListeners(eventName);
  }

  unregisterEvent(eventName: string, listener: (...args) => void) {
    this.removeListener(eventName, listener);
    let listeners = this.listenerRegistry.get(eventName) || [];
    listeners = listeners.filter((l) => l.listener !== listener);
    this.listenerRegistry.set(eventName, listeners);
  }
}
