import {
  RequestPayload,
  ResponsePayload,
  type QueueElement,
  type SharedWorkerGlobalScope,
  type TabDescriptor,
  MessageType,
  SharedHandleTypes,
} from "./types";

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;

class Counter {
  count = 0;
  next() {
    return this.count++;
  }
}

class TabManager {
  /**
   * 事件队列并行执行最大数量
   */
  static MAX_CONCURRENCY = 5;
  tabIdCounter = new Counter();
  /**
   * 所有标签
   */
  tabs: TabDescriptor[] = [];
  /**
   * 领导者
   */
  leader: TabDescriptor | null = null;
  /**
   * 竞选者
   */
  campaigners: TabDescriptor[] = [];
  eventQueue: QueueElement[] = [];
  /**
   * 当前正在处理的任务
   */
  activeTasks: QueueElement[] = [];
  /**
   * 是否正在调度
   */
  isDispatching = false;

  constructor() {
    this.register();
  }

  private enqueue(tab: TabDescriptor, payload: RequestPayload) {
    this.eventQueue.push({
      tabId: tab.id,
      payload,
    });
    this.processQueue();
  }

  private processQueue() {
    if (!this.leader) {
      this.electLeader();
    } else if (!this.isDispatching) {
      this.dispatch();
    }
  }

  private getTabById(id: string) {
    const tab = this.tabs.find((tab) => tab.id === id);
    return tab;
  }

  private getTabIndexById(id: string) {
    return this.tabs.findIndex((t) => t.id === id);
  }

  private dispatch() {
    this.isDispatching = true;
    while (
      this.activeTasks.length < TabManager.MAX_CONCURRENCY &&
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
    const tab = this.getTabById(tabId);

    if (!tab) {
      this.completeTask(task, false, "Tab not found");
      return;
    }

    if (SharedHandleTypes.includes(payload.type)) {
      // SharedWorker 处理任务
      this.handleSharedWorkerEvent(tab, task);
    } else {
      // 领导者处理任务
      this.sendToLeader(task);
    }
  }

  private handleSharedWorkerEvent(tab: TabDescriptor, task: QueueElement) {
    const { payload } = task;
    // 模拟任务完成
    setTimeout(() => {
      this.completeTask(task, true, "Task completed");
    }, 1000); // 模拟任务处理时间
  }

  private sendToLeader(task: QueueElement) {
    const { payload } = task;
    if (this.leader) {
      this.leader.prot.postMessage(payload);
    }
  }

  private completeTask(task: QueueElement, success: boolean, data: any) {
    const { tabId, payload } = task;
    const tab = this.getTabById(tabId);
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

  /**
   * 竞选leader
   */
  private electLeader() {
    if (this.campaigners.length === 0) {
      if (this.tabs.length === 0) {
        throw new Error("No tabs available");
      }
      this.campaigners = this.tabs.slice();
    }
    this.leader = this.campaigners.pop()!;
    this.processQueue();
  }

  private handleMessage(tab: TabDescriptor) {
    const { prot } = tab;
    prot.addEventListener("message", (e: MessageEvent) => {
      const message = e.data as RequestPayload;
      this.enqueue(tab, message);
    });
  }

  private onTabDestroy(tab: TabDescriptor) {
    const idx = this.getTabIndexById(tab.id);
    if (idx !== -1) {
      this.tabs.splice(idx, 1);
      if (this.leader === tab) {
        this.electLeader();
      }
    }
  }

  private register() {
    globalThis.addEventListener("connect", (e: MessageEvent) => {
      const port = e.ports[0];
      const tab = {
        id: "tab" + this.tabIdCounter.next(),
        prot: port,
      };
      this.tabs.push(tab);
      this.handleMessage(tab);
    });
  }
}

const tabManager = new TabManager();
