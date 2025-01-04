import { MessageType, type RequestPayload, type ResponsePayload } from "./types";

export class InitSharedWorker {
  private worker: SharedWorker | null = null
  private port: MessagePort | null = null
  private _initStatus: boolean = false
  constructor(url: string, options?: WorkerOptions) {
    this.init(url, options)
  }
  private init(url: string, options?: WorkerOptions) {
    if (this.worker) {
      return
    }
    this.worker = new SharedWorker(new URL(url, import.meta.url), options)
    this.port = this.worker.port

    this.port.onmessage = (e) => {
      if (e.data.type === MessageType.CONNECTED) {
        this._initStatus = true
        return
      }

      // 处理任务结果
    }
    this.port.start();
  }

  get initStatus() {
    return this._initStatus
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
    if (!this.port) {
      return Promise.reject(new Error("Worker not initialized"));
    }
    return new Promise((resolve) => {

    });
  }

  destroy() {
    this.port?.close()
    this.worker = null
    this.port = null
    this._initStatus = false
  }
}
