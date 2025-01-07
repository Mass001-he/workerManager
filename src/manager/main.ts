import { Emitter } from '../event';
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
import { generateReqId } from './utils';

export class InitSharedWorker {
  private worker: SharedWorker | null = null;
  private port!: MessagePort;
  private promiseMap: Map<
    string,
    { resolve: (data: any) => void; reject: (data: any) => void }
  >;

  private _onNotice = new Emitter<NoticePayload>();
  onNotice = this._onNotice.event;

  static instance: InitSharedWorker | null = null;
  private static instancePromise: Promise<InitSharedWorker> | null = null;

  private server = new Server();
  createService = this.server.createService.bind(this.server);

  static async create() {
    if (InitSharedWorker.instance) {
      return InitSharedWorker.instance;
    }
    if (InitSharedWorker.instancePromise) {
      return InitSharedWorker.instancePromise;
    }
    InitSharedWorker.instancePromise = new Promise<InitSharedWorker>(
      (resolve) => {
        const ins = new InitSharedWorker();
        const handle = (e: any) => {
          const { type, data } = e.data as PayloadLike;
          if (
            type === MessageType.Notice &&
            data.action === TabAction.Connected
          ) {
            InitSharedWorker.instance = ins;
            InitSharedWorker.instancePromise = null;
            resolve(ins);
          }
          ins.port.removeEventListener('message', handle);
        };
        ins.port.addEventListener('message', handle);
      },
    );
    return InitSharedWorker.instancePromise;
  }

  private constructor() {
    this.promiseMap = new Map();
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
      console.error('Message port error:', error);
    };

    this.onNotice((e) => {
      console.log('onNotice', e);
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
    console.log('onResponse', payload);
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

  private async onDispatchRequest(payload: DispatchRequestPayload) {
    console.log('onDispatchRequest', payload);

    const { data } = payload;
    const { tasks } = data;

    tasks.forEach(async (task) => {
      try {
        const { serviceName, params } = task.data;

        const handle = this.server.getService(serviceName);
        const res = await handle(params);
        const _payload: DispatchResponsePayload = {
          data: res,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
          success: true,
        };
        console.log('_payload', _payload);
        this.post(_payload);
      } catch (error: any) {
        const _payload: DispatchResponsePayload = {
          data: null,
          message: error?.message || 'unknown error',
          success: false,
          type: MessageType.DispatchResponse,
          reqId: task.reqId,
        };
        console.log('postManager', _payload);
        this.post(_payload);
      }
    });
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
      _payload.reqId = generateReqId();
    }
    if (payload.type === undefined) {
      _payload.type = MessageType.NoResRequest;
    }
    console.log('post', _payload);
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
        _payload.reqId = generateReqId();
      }
      if (payload.type === undefined) {
        _payload.type = MessageType.Request;
      }
      this.promiseMap.set(_payload.reqId!, { resolve, reject });
      this.port.postMessage(_payload);
    });
  };

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
  };
}
