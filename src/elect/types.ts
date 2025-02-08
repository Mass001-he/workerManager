import type { NodeAction, SchedulerAction } from './controller/constant';
import type { Service } from './node/service';

export enum MessageType {
  /** 不需要调度器响应的请求 */
  NodeNotice = 'NodeNotice',
  /** 请求调度器方法 */
  Request = 'Request',
  /** 调度器响应请求 */
  Response = 'Response',
  /** 请求调度Leader服务 */
  ServiceRequest = 'ServiceRequest',
  /** 响应调度Leader请求 */
  ServiceResponse = 'ServiceResponse',
  /** 调度器指派执行者请求 */
  DispatchRequest = 'DispatchRequest',
  /** 执行者响应调度器指派请求 */
  DispatchResponse = 'DispatchResponse',
  /** 调度器通知 */
  SchedulerNotice = 'Notice',
  /** 广播 */
  Broadcast = 'Broadcast',
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

export interface RequestPayload extends BaseRequestPayload {
  data: {
    action: SchedulerAction;
  };
}

export interface NoticePayload {
  data: {
    action: NodeAction;
    [index: string]: any;
  };
  type: MessageType.SchedulerNotice;
}

export interface BroadcastPayload<T extends Record<string, any> = any> {
  type: MessageType.Broadcast;
  data: T;
}

export interface DispatchRequestPayload extends BaseRequestPayload {
  type: MessageType.DispatchRequest;
  data: {
    tasks: ServiceRequestPayload<ServiceRequestBody>[];
  };
}

export interface DispatchResponsePayload<T = any> extends BaseResponsePayload {
  targetNodeId: string;
  reqId: string;
  data: T;
  type: MessageType.DispatchResponse;
}

export interface ServiceRequestBody<T = any> {
  serviceName: string;
  params: T;
}

export interface ServiceRequestPayload<T = any> extends BaseRequestPayload {
  reqId: string;
  data: ServiceRequestBody<T>;
}

export interface ResponsePayload<T = any> extends BaseResponsePayload {
  reqId: string;
  data: T;
}

export interface NodeNoticePayload extends BaseRequestPayload {
  data: {
    action: NodeAction;
  };
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

export interface TabNodeDescriptor {
  id: string;
  prot: MessagePort;
}

export interface PayloadOptions {
  reqId?: string;
  type?: MessageType;
  data?: {
    action?: NodeAction | SchedulerAction;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface NodeOptions {
  /**
   * 广播的事件是否需要广播给自己
   * @default true
   */
  broadcastSelf?: boolean;
  /**
   * 收到上任通知，会在此函数结束后上任,内部会发送`UpperReady`通知
   * @param service
   * @returns
   */
  onElection?: (service: Service) => void | Promise<void>;
}
