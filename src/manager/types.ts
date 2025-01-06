import type { TabAction } from './tabScheduler/constant';

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

export type ReqId = string;

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
}

export interface NoticePayload extends BaseResponsePayload {
  data: {
    action: TabAction;
  };
  type: MessageType.Notice;
}

export interface DispatchRequestPayload<T = any> extends BaseRequestPayload<T> {
  type: MessageType.DispatchRequest;
  reqId: string;
  data: T;
}

export interface DispatchResponsePayload<T = any> extends BaseResponsePayload {
  reqId: string;
  data: T;
  type: MessageType.DispatchResponse;
}

export interface RequestPayload<T = any> extends BaseRequestPayload<T> {
  reqId: string;
  data: T;
}

export interface ResponsePayload<T = any> extends BaseResponsePayload {
  reqId: string;
  data: T;
}

export interface NoResRequestPayload extends BaseRequestPayload {}

export type MessageTypeMap = {
  [MessageType.NoResRequest]: NoResRequestPayload;
  [MessageType.Request]: RequestPayload;
  [MessageType.Response]: ResponsePayload;
  [MessageType.DispatchRequest]: DispatchRequestPayload;
  [MessageType.DispatchResponse]: DispatchResponsePayload;
  [MessageType.Notice]: NoticePayload;
};

export interface QueueElement<T = any> {
  tabId: string;
  payload: RequestPayload<T>;
}

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
