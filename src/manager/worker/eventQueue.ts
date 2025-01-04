import {
  SharedHandleTypes,
  type QueueElement,
  type RequestPayload,
  type ResponsePayload,
  type TabDescriptor,
} from "../types";

export class EventQueue {
  static MAX_CONCURRENCY = 5;
  /**
   * 修改并发数
   */
  static changeConcurrency(value: number) {
    this.MAX_CONCURRENCY = value;
  }
  eventQueue: QueueElement[] = [];
  activeTasks: QueueElement[] = [];
  isDispatching = false;

  constructor() {}

  enqueue(tabId: string, payload: RequestPayload) {
    this.eventQueue.push({ tabId, payload });
    this.processQueue();
  }

  processQueue() {
    if (!this.center.leaderElection.leader) {
      this.center.leaderElection.electLeader();
    } else if (!this.isDispatching) {
      this.dispatch();
    }
  }

  private dispatch() {
    this.isDispatching = true;
    while (
      this.activeTasks.length < EventQueue.MAX_CONCURRENCY &&
      this.eventQueue.length > 0
    ) {
      const task = this.eventQueue.shift()!;
      this.activeTasks.push(task);
      this.handleTask(task);
    }
    this.isDispatching = false;
  }

  private handleTask(task: QueueElement) {
    const { tabId, payload } = task;
    const tab = this.center.tabManager.getTabById(tabId);

    if (!tab) {
      this.completeTask(task, false, "Tab not found");
      return;
    }

    if (SharedHandleTypes.includes(payload.type)) {
      this.handleSharedWorkerEvent(tab, task);
    } else {
      this.sendToLeader(task);
    }
  }

  private handleSharedWorkerEvent(tab: TabDescriptor, task: QueueElement) {
    setTimeout(() => {
      this.completeTask(task, true, "Task completed");
    }, 1000);
  }

  private sendToLeader(task: QueueElement) {
    const { payload } = task;
    if (this.center.leaderElection.leader) {
      this.center.leaderElection.leader.prot.postMessage(payload);
    }
  }

  private completeTask(task: QueueElement, success: boolean, data: any) {
    const { tabId, payload } = task;
    const tab = this.center.tabManager.getTabById(tabId);
    if (tab) {
      const response: ResponsePayload = {
        reqId: payload.reqId,
        success,
        data,
      };
      tab.prot.postMessage(response);
    }
    this.activeTasks = this.activeTasks.filter((t) => t !== task);
    this.processQueue();
  }

  public destroy() {
    this.eventQueue = [];
    this.activeTasks = [];
  }
}
