import { Emitter, Logger } from '../utils';
import { Service } from './service';
import { SchedulerAction, TabAction } from '../controller/constant';
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
import { Counter } from '../utils';

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

  private _onElection = new Emitter<Service>();
  onElection = this._onElection.event;

  static instance: Node | null = null;
  private static instancePromise: Promise<Node> | null = null;

  private logger = Logger.scope('Node');

  server: Service | undefined;

  #isLeader: boolean;
  get isLeader() {
    return this.#isLeader;
  }
  #tabId!: string;
  get tabId() {
    return this.#tabId;
  }
  private _cacheTask: any[];
  private tabIdCounter = new Counter();
  private options: NodeOptions;

  static async create(sharedWorker: SharedWorker) {
    if (Node.instance) {
      return Node.instance;
    }
    if (Node.instancePromise) {
      return Node.instancePromise;
    }
    Node.instancePromise = new Promise<Node>((resolve) => {
      const ins = new Node(sharedWorker);
      const handle = (e: any) => {
        const { type, data } = e.data as PayloadLike;
        if (
          type === MessageType.Notice &&
          data.action === TabAction.Connected
        ) {
          ins.logger.info('Connected', data).print();
          ins.#tabId = data.id;
          ins.campaign();
          Node.instance = ins;
          Node.instancePromise = null;
          resolve(ins);
        }
        ins.port.removeEventListener('message', handle);
      };
      ins.port.addEventListener('message', handle);
      ins.init();
    });
    return Node.instancePromise;
  }

  private constructor(sharedWorker: SharedWorker, options: NodeOptions = {}) {
    this.logger.info('Created').print();
    this.options = { ...DefaultNodeOptions, ...options };
    this.promiseMap = new Map();
    this._cacheTask = [];
    this.#isLeader = false;
    this.worker = sharedWorker;
  }

  private init = () => {
    window.onbeforeunload = () => {
      this.destroy();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            this.campaign();
          }
        }, DelayMs);
      }
    });
    this.register();
    this.port.start();

    this.onNotice((e: NoticePayload) => {
      if (e.data.action === TabAction.Connected) {
        return;
        //链接的处理在create的静态方法中
      }
      this.logger.info('onNotice', e).print();

      if (e.data.action === TabAction.LeaderChange) {
        // leader 变化，1. 需要重新 初始化 createService 2. 如果变化前当前tab是leader，需要 注销 service
        const currentLeader = e.data.id;
        if (this.#tabId === currentLeader) {
          this.#isLeader = true;
          const server = new Service();
          this.onServerDidCreate(server);

          this._onElection.fire(server);
        } else {
          this.#isLeader = false;
          this.server?.destroy();
        }
      }
    });
  };

  private register() {
    this.port.addEventListener('message', (ev) => {
      const { type } = ev.data as PayloadLike;

      switch (type) {
        case MessageType.Notice:
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
        action: SchedulerAction.Campaign,
      },
    });
  };

  private onResponse(payload: ResponsePayload) {
    this.logger.info('onResponse', payload).print();
    const { success, reqId, data } = payload;
    const mHandlerPromiser = this.promiseMap.get(reqId);
    if (mHandlerPromiser) {
      if (success) {
        mHandlerPromiser.resolve(data);
      } else {
        mHandlerPromiser.reject(data);
      }
      this.promiseMap.delete(reqId);
    }
  }

  private onServerDidCreate(server: Service) {
    this.logger.info('ServerDidCreate').print();
    this.server = server;

    this.handleTasks(this._cacheTask);
    this._cacheTask = [];
  }

  private handleTasks(tasks: any[]) {
    tasks.forEach(async (task) => {
      try {
        if (this.server === undefined) {
          this.logger.info('server is undefined').print();
          return;
        }
        const { serviceName, params } = task.data;

        const handle = this.server.get(serviceName);
        const res = await handle(params);
        const _payload: DispatchResponsePayload = {
          data: res,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
          success: true,
        };
        this.logger
          .info('handleDispatch', {
            serviceName,
            params,
            res,
            reqId: task.reqId,
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
    if (this.server === undefined) {
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
      _payload.type = MessageType.NoResRequest;
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
    return `${this.#tabId}_${this.tabIdCounter.next()}`;
  }

  destroy = () => {
    this.post({
      data: {
        action: SchedulerAction.Destroy,
      },
    });
    this.server?.destroy();
    this.port?.close();
    this.promiseMap.clear();
    this._onNotice.dispose();
    this._cacheTask = [];
  };
}
