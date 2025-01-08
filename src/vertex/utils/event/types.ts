/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/**
 * An object that performs a cleanup operation when `.dispose()` is called.
 *
 * Some examples of how disposables are used:
 *
 * - An event listener that removes itself when `.dispose()` is called.
 * - A resource such as a file system watcher that cleans up the resource when `.dispose()` is called.
 * - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
 */
export interface IDisposable {
  dispose(): void;
}

export const Disposable = {
  None: Object.freeze<IDisposable>({ dispose() {} }),
};

export interface DOMEventEmitter {
  addEventListener(event: string | symbol, listener: Function): void;
  removeEventListener(event: string | symbol, listener: Function): void;
}

export interface NodeEventEmitter {
  on(event: string | symbol, listener: Function): unknown;
  removeListener(event: string | symbol, listener: Function): unknown;
}

export interface IEventDeliveryQueue {
  _isEventDeliveryQueue: true;
}

/**
 * @description_zh 一个可以订阅的事件，可以有零个或一个参数。事件本身是一个函数。
 * @description_en An event with zero or one parameters that can be subscribed to. The event is a function itself.
 */
export interface IEvent<T = void> {
  (listener: (e: T) => unknown, thisArgs?: any): IDisposable;
}
