import { Emitter } from '../event';
import { Logger } from '../logger';
import Server from './service';
import { SchedulerAction, TabAction } from './tabScheduler/constant';
import {
  DispatchRequestPayload,
  DispatchResponsePayload,
  MessageType,
  PayloadOptions,
  type NoticePayload,
  type PayloadLike,
  type ResponsePayload,
} from './types';
import { Counter } from './utils';

export class Client {
  private worker: SharedWorker | null = null;
  private port!: MessagePort;
  private promiseMap: Map<
    string,
    { resolve: (data: any) => void; reject: (data: any) => void }
  >;

  private _onNotice = new Emitter<NoticePayload>();
  onNotice = this._onNotice.event;

  private _onElectioned = new Emitter<Server>();
  onElectioned = this._onElectioned.event;

  static instance: Client | null = null;
  private static instancePromise: Promise<Client> | null = null;

  private logger = Logger.scope('Client');

  #tabId!: string;
  server: Server | undefined;
  createService: (() => void) | undefined;

  private _isLeader: boolean;
  private _cacheTask: any[];

  get tabId() {
    return this.#tabId;
  }

  public tabIdCounter = new Counter();

  static async create() {
    if (Client.instance) {
      return Client.instance;
    }
    if (Client.instancePromise) {
      return Client.instancePromise;
    }
    Client.instancePromise = new Promise<Client>((resolve) => {
      const ins = new Client();
      const handle = (e: any) => {
        const { type, data } = e.data as PayloadLike;
        if (
          type === MessageType.Notice &&
          data.action === TabAction.Connected
        ) {
          Client.instance = ins;
          Client.instancePromise = null;
          resolve(ins);
        }
        ins.port.removeEventListener('message', handle);
      };
      ins.port.addEventListener('message', handle);
    });
    return Client.instancePromise;
  }

  private constructor() {
    this.promiseMap = new Map();
    this._cacheTask = [];
    this._isLeader = false;
    this.init();
  }

  private init = () => {
    if (this.worker) {
      return;
    }
    this.worker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
      name: 'managerWorker',
    });
    this.port = this.worker.port;
    this.port.start();
    this.campaign();
    this.register();

    window.onbeforeunload = () => {
      this.destroy();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.campaign();
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
        default:
          break;
      }
    });

    this.port.onmessageerror = (error) => {
      this.logger.error('Message port error:', error).print();
    };

    this.onNotice((e: NoticePayload) => {
      this.logger.info('onNotice', e).print();
      if (e.data.action === TabAction.Connected) {
        this.#tabId = e.data.id;
      }
      if (e.data.action === TabAction.LeaderChange) {
        // leader 变化，1. 需要重新 初始化 createService 2. 如果变化前当前tab是leader，需要 注销 service
        const currentLeader = e.data.id;
        if (this.#tabId === currentLeader) {
          this._isLeader = true;
          // this.onServerWillCreate()
          const server = new Server();
          this.onServerDidCreate(server);

          this._onElectioned.fire(server);
        } else {
          this._isLeader = false;
          this.server?.destroy();
        }
      }
    });
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

  private onServerWillCreate() {
    // 收集 server 未创建完成之前收到的任务
  }

  private onServerDidCreate(server: Server) {
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

        const handle = this.server.getService(serviceName);
        const res = await handle(params);
        const _payload: DispatchResponsePayload = {
          data: res,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
          success: true,
        };
        this.logger.info('_payload', _payload).print();
        this.post(_payload);
      } catch (error: any) {
        const _payload: DispatchResponsePayload = {
          data: null,
          message: error?.message || 'unknown error',
          success: false,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
        };
        this.logger.info('postManager', _payload).print();
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
   * 递交任务给tabManager, 不关心结果
   * @param payload
   */
  post(payload: PayloadOptions) {
    const _payload = {
      ...payload,
    };
    if (payload.reqId === undefined) {
      _payload.reqId = this.generateReqId();
    }
    if (payload.type === undefined) {
      _payload.type = MessageType.NoResRequest;
    }
    this.logger.info('post', _payload).print();
    this.port.postMessage(_payload);
  }

  /**
   * 请求tabManager，返回结果
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

  generateReqId() {
    return `${this.#tabId}_${this.tabIdCounter.next()}`;
  }

  destroy = () => {
    this.post({
      data: {
        action: SchedulerAction.Destroy,
      },
    });
    this.port?.close();
    this.worker = null;
    this.promiseMap.clear();
    this._onNotice.dispose();
    this._cacheTask = [];
  };
}
