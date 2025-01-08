import type { SchedulerAction, TabAction } from './tabScheduler/constant';

export enum MessageType {
  /** 不需要调度器响应的请求 */
  NoResRequest = 'NoResRequest',
  /** 请求调度器服务 */
  Request = 'Request',
  /** 响应调度器请求 */
  Response = 'Response',
  /** 调度器指派执行者请求 */
  DispatchRequest = 'DispatchRequest',
  /** 执行者响应调度器指派请求 */
  DispatchResponse = 'DispatchResponse',
  /** 调度器通知 */
  Notice = 'Notice',
}

export interface PayloadLike {
  type: MessageType;
  [key: string]: any;
}

export interface BaseRequestPayload<T = any> {
  type: MessageType;
  reqId?: string;
  data?: T;
}

export interface BaseResponsePayload {
  type: MessageType;
  success: boolean;
  message?: string;
}

export interface NoticePayload extends BaseRequestPayload {
  data: {
    action: TabAction;
    [index: string]: any;
  };
  type: MessageType.Notice;
}

export interface DispatchRequestPayload extends BaseRequestPayload {
  type: MessageType.DispatchRequest;
  data: {
    tasks: RequestPayload<RequestBody>[];
  };
}

export interface DispatchResponsePayload<T = any> extends BaseResponsePayload {
  reqId: string;
  data: T;
  type: MessageType.DispatchResponse;
}

export interface RequestBody<T = any> {
  serviceName: string;
  params: T;
}

export interface RequestPayload<T = any> extends BaseRequestPayload {
  reqId: string;
  data: RequestBody<T>;
}

export interface ResponsePayload<T = any> extends BaseResponsePayload {
  reqId: string;
  data: T;
}

export interface NoResRequestPayload extends BaseRequestPayload {}

//@ts-ignore
export interface SharedWorkerGlobalScope extends EventTarget {
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => any) | null;
  addEventListener(
    type: 'connect',
    listener: (this: SharedWorkerGlobalScope, ev: MessageEvent) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

export interface TabDescriptor {
  id: string;
  prot: MessagePort;
}

export type Prettier<T> = {
  [P in keyof T]: T[P];
};

export type OptionProperty<T, K extends keyof T> = Prettier<
  Partial<Pick<T, K>> & Omit<T, K>
>;

export interface PayloadOptions {
  reqId?: string;
  type?: MessageType;
  data?: {
    action?: SchedulerAction;
    [key: string]: any;
  };
  [key: string]: any;
}