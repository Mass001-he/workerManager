import { Emitter } from "../event";
import { MessageType, type RequestPayload, type ResponsePayload } from "./types";

export class InitSharedWorker {
  private worker: SharedWorker | null = null
  private port: MessagePort | null = null
  private _initStatus: boolean = false
  private messageQueue: Map<string, (data: any) => void>;
  private messageRejectQueue: Map<string, (data: any) => void>;

  protected _onMessage = new Emitter();

  onMessage = this._onMessage.event;

  constructor() {
    this.messageQueue = new Map();
    this.messageRejectQueue = new Map();
    this.init()
  }
  private init() {
    if (this.worker) {
      return
    }
    this.worker = new SharedWorker(
      new URL("./worker/index.ts", import.meta.url),
      {
        name: "managerWorker",
      }
    )
    this.port = this.worker.port
    this.port.start();

    this.register()
  }

  get initStatus() {
    return this._initStatus
  }

  register() {
    if (!this.port) {
      return
    }
    this.port.onmessage = (event) => {
      const { data, reqId, type } = event.data;
      if (type === MessageType.CONNECTED) {
        this._initStatus = true
        this._onMessage.fire();
        return
      }

      const resolve = this.messageQueue.get(reqId);
      if (resolve) {
        resolve(data);
        this.messageQueue.delete(reqId);
      }
    }

    this.port.onmessageerror = (error) => {
      console.error('Message port error:', error);
    };
  }

  /**
   * 递交任务给tabManager, 不关心结果
   * @param payload
   */
  postManager(payload: RequestPayload) {
    if (!this.port) {
      return
    }
    this.port.postMessage(payload);
  }

  /**
   * 请求tabManager，返回结果
   * @param payload
   */
  requestManager(
    payload: RequestPayload
  ): Promise<ResponsePayload> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        return Promise.reject(new Error("Worker not initialized"));
      }

      this.messageQueue.set(payload.reqId, resolve);
      this.messageRejectQueue.set(payload.reqId, reject);
      this.port.postMessage(payload);
    });
  }

  destroy() {
    this.port?.close()
    this.worker = null
    this.port = null
    this._initStatus = false
    this._onMessage.dispose()
  }
}
