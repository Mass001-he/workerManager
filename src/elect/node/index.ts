import { Disposer, Emitter, Logger } from '../../utils';
import { Service } from './service';
import { NodeAction } from '../controller/constant';
import {
  DispatchRequestPayload,
  DispatchResponsePayload,
  MessageType,
  PayloadOptions,
  type BroadcastPayload,
  type NodeOptions,
  type NoticePayload,
  type PayloadLike,
  type ResponsePayload,
} from '../types';
import { Counter } from '../../utils';

const DelayMs = 1500;

/**
 * 默认节点选项
 */
const DefaultNodeOptions: NodeOptions = {
  broadcastSelf: true,
};
export class Node {
  private worker: SharedWorker;
  get port() {
    return this.worker.port;
  }
  private promiseMap: Map<
    string,
    { resolve: (data: any) => void; reject: (data: any) => void }
  >;

  private _onNotice = new Emitter<NoticePayload>();
  onNotice = this._onNotice.event;

  private _onBroadcast = new Emitter<BroadcastPayload>();
  onBroadcast = this._onBroadcast.event;

  private logger = Logger.scope('Node');
  private disposer = new Disposer();
  service: Service | undefined;

  #isLeader: boolean;
  get isLeader() {
    return this.#isLeader;
  }
  private _cacheTask: any[];
  private reqIdCounter = new Counter();
  private options: NodeOptions;

  constructor(sharedWorker: SharedWorker, options: NodeOptions = {}) {
    this.logger.info('Created').print();
    this.options = { ...DefaultNodeOptions, ...options };
    this.promiseMap = new Map();
    this._cacheTask = [];
    this.#isLeader = false;
    this.worker = sharedWorker;
    this.init();
  }

  private init = () => {
    window.onbeforeunload = () => {
      this.destroy();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            this.campaign();
          }
        }, DelayMs);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.disposer.add(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
    this.register();
    this.port.start();

    this.onNotice((e: NoticePayload) => {
      this.logger.info('onNotice', e).print();
      switch (e.data.action) {
        case NodeAction.LeaderChange:
          this.#isLeader = false;
          this.service?.destroy();
          break;
        case NodeAction.CompletionToElection:
          this.completionToElection();
          break;
        default:
          this.logger.error('unknown notice', e).print();
          break;
      }
    });
  };

  async completionToElection() {
    this.logger.info('completionToElection').print();
    this.#isLeader = true;
    this.service = new Service();
    this.handleTasks(this._cacheTask);
    this._cacheTask = [];
    await this.options.onElection?.(this.service);
    this.post({
      data: {
        action: NodeAction.UpperReady,
      },
    });
    this.logger.info('Election success').print();
  }

  private register() {
    this.port.addEventListener('message', (ev) => {
      const { type } = ev.data as PayloadLike;

      switch (type) {
        case MessageType.SchedulerNotice:
          this._onNotice.fire(ev.data as NoticePayload);
          break;
        case MessageType.Response:
          this.onResponse(ev.data);
          break;
        case MessageType.DispatchRequest:
          this.onDispatchRequest(ev.data);
          break;
        case MessageType.Broadcast:
          this._onBroadcast.fire(ev.data as BroadcastPayload);
          break;
        default:
          this.logger.warn('unknown message', ev.data).print();
          break;
      }
    });

    this.port.onmessageerror = (error) => {
      this.logger.error('Message port error:', error).print();
    };
  }

  private campaign = () => {
    this.post({
      data: {
        action: NodeAction.Campaign,
      },
    });
  };

  private onResponse(payload: ResponsePayload) {
    this.logger.info('onResponse', payload).print();
    const { success, reqId } = payload;
    const mHandlerPromiser = this.promiseMap.get(reqId);
    if (mHandlerPromiser) {
      if (success) {
        mHandlerPromiser.resolve(payload);
      } else {
        mHandlerPromiser.reject(payload);
      }
      this.promiseMap.delete(reqId);
    }
  }

  private handleTasks(tasks: any[]) {
    tasks.forEach(async (task) => {
      try {
        if (this.service === undefined) {
          this.logger.info('server is undefined').print();
          return;
        }
        const { serviceName, params } = task.data;

        const handle = this.service.get(serviceName);
        const res = await handle(params);
        const _payload: DispatchResponsePayload = {
          data: res,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
          targetNodeId: task.nodeId,
          success: true,
        };
        this.logger
          .info('handleDispatch', {
            serviceName,
            params,
            res,
            reqId: task.reqId,
            nodeId: task.nodeId,
          })
          .print();
        this.post(_payload);
      } catch (error: any) {
        const _payload: DispatchResponsePayload = {
          data: null,
          message: error?.message || 'unknown error',
          success: false,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
          targetNodeId: task.nodeId,
        };
        this.logger
          .error('handleDispatch', {
            serviceName: task.data.serviceName,
            params: task.data.params,
            error,
            reqId: task.reqId,
          })
          .print();
        this.post(_payload);
      }
    });
  }

  private async onDispatchRequest(payload: DispatchRequestPayload) {
    this.logger.info('onDispatchRequest', payload).print();
    const { data } = payload;
    const { tasks } = data;
    if (this.service === undefined) {
      this._cacheTask = [...this._cacheTask, ...tasks];
      return;
    }

    this.handleTasks(tasks);
  }

  /**
   * 递交scheduler, 不关心结果，没有返回
   * @param payload
   */
  post(payload: PayloadOptions, log = true) {
    const _payload = {
      ...payload,
    };
    if (payload.reqId === undefined) {
      _payload.reqId = this.generateReqId();
    }
    if (payload.type === undefined) {
      _payload.type = MessageType.NodeNotice;
    }
    if (log) {
      this.logger.info('Post', _payload).print();
    }
    this.port.postMessage(_payload);
  }

  /**
   * 请求scheduler返回结果
   * @param payload
   */
  request(serviceName: string, params: any): Promise<ResponsePayload> {
    return this._request({
      data: {
        params,
        serviceName,
      },
    });
  }

  /**
   * 广播给所有Node
   */
  broadcast<T extends Record<string, any> = any>(body: T) {
    this.post({
      type: MessageType.Broadcast,
      data: body,
      toSelf: this.options.broadcastSelf,
    });
  }

  /**
   *
   * @param payload
   * @returns
   */
  private _request = (payload: PayloadOptions): Promise<ResponsePayload> => {
    return new Promise((resolve, reject) => {
      const _payload = {
        ...payload,
      };
      if (payload.reqId === undefined) {
        _payload.reqId = this.generateReqId();
      }
      if (payload.type === undefined) {
        _payload.type = MessageType.Request;
      }
      this.promiseMap.set(_payload.reqId!, { resolve, reject });
      this.port.postMessage(_payload);
    });
  };

  private generateReqId() {
    return `${this.reqIdCounter.next()}`;
  }

  destroy = () => {
    this.post({
      data: {
        action: NodeAction.Destroy,
      },
    });
    this.disposer.dispose();
    this.service?.destroy();
    this.port?.close();
    this.promiseMap.clear();
    this._onNotice.dispose();
    this._onBroadcast.dispose();
    this._cacheTask = [];
  };
}
