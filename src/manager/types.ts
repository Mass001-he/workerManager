export enum MessageType {
  /**
   * 销毁
   */
  DESTROY = "DESTROY",
  /**
   * 参选
   */
  ELECTION = "ELECTION",
}

export interface RequestPayload<T = any> {
  type: MessageType;
  reqId: string;
  data?: T;
}

export interface QueueElement<T = any> {
  tabId: string;
  payload: RequestPayload<T>;
}

export interface ResponsePayload<T = any> {
  reqId: string;
  success: boolean;
  data?: T;
  message?: string;
}

//@ts-ignore
export interface SharedWorkerGlobalScope extends EventTarget {
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => any) | null;
  addEventListener(
    type: "connect",
    listener: (this: SharedWorkerGlobalScope, ev: MessageEvent) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export interface TabDescriptor {
  id: string;
  prot: MessagePort;
}
