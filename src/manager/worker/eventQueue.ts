import { Emitter } from "../../event";
import { Logger } from "../../logger";
import { type QueueElement, type RequestPayload } from "../types";

export class EventQueue {
  static MAX_CONCURRENCY = 5;
  /**
   * 修改并发数
   */
  static changeConcurrency(value: number) {
    this.MAX_CONCURRENCY = value;
  }
  protected eventQueue: QueueElement[] = [];
  protected activeTasks: QueueElement[] = [];
  protected isDispatching = false;

  protected _onProcessQueue = new Emitter();
  protected _onTaskRun = new Emitter<QueueElement>();
  public onProcessQueue = this._onProcessQueue.event;
  public onTaskRun = this._onTaskRun.event;

  private logger = Logger.scope("EventQueue");

  constructor() {
    this.logger.info("EventQueue created");
  }

  public enqueue(tabId: string, payload: RequestPayload) {
    this.eventQueue.push({ tabId, payload });
    this.processQueue();
  }

  public processQueue() {
    this._onProcessQueue.fire();
    if (!this.isDispatching) {
      this.dispatch();
    }
  }

  public completeTask(
    task: QueueElement,
    callback: boolean,
    message?: string
  ) {
    
  }

  public destroy() {
    this.eventQueue = [];
    this.activeTasks = [];
    this._onProcessQueue.dispose();
    this._onTaskRun.dispose();
  }

  private pushTask(task: QueueElement) {
    this.activeTasks.push(task);
    if (this._onTaskRun.hasListeners()) {
      this._onTaskRun.fire(task);
    } else {
      throw new Error("No listener for task run event");
    }
  }

  private dispatch() {
    this.isDispatching = true;
    while (
      this.activeTasks.length < EventQueue.MAX_CONCURRENCY &&
      this.eventQueue.length > 0
    ) {
      const task = this.eventQueue.shift()!;
      this.pushTask(task);
    }
    this.isDispatching = false;
  }
}
