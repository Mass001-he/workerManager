import { Emitter } from '../event';
import { SchedulerAction, TabAction } from './tabScheduler/constant';
import {
  MessageType,
  type NoticePayload,
  type PayloadLike,
  type RequestPayload,
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

  private onDispatchRequest(payload: ResponsePayload) {
    console.log('onDispatchResponse', payload);
  }

  /**
   * 递交任务给tabManager, 不关心结果
   * @param payload
   */
  post(payload: Omit<RequestPayload, 'reqId' | 'type'>) {
    const _payload = {
      reqId: generateReqId(),
      type: MessageType.NoResRequest,
      ...payload,
    };
    console.log('post', _payload);
    this.port.postMessage(_payload);
  }

  /**
   * 请求tabManager，返回结果
   * @param payload
   */
  request(
    payload: Omit<RequestPayload, 'reqId' | 'type'>,
  ): Promise<ResponsePayload> {
    return new Promise((resolve, reject) => {
      const _payload = {
        reqId: generateReqId(),
        type: MessageType.Request,
        ...payload,
      };
      this.promiseMap.set(_payload.reqId, { resolve, reject });
      this.port.postMessage(_payload);
    });
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
  };
}
