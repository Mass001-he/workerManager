import {
  RequestPayload,
  type QueueElement,
  type SharedWorkerGlobalScope,
  type TabDescriptor,
} from "./types";

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;

class TabManager {
  /**
   * 事件队列并行执行最大数量
   */
  static MAX_CONCURRENCY = 5;
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
    } else {
      this.dispatch();
    }
  }

  private getTabById(id: string) {
    const tab = this.tabs.find((tab) => tab.id === id);
    return tab;
  }

  private dispatch() {
    if (this.eventQueue.length === 0) {
      return;
    }
    //任务完成的定义是，无论成功或报错
    //1.从队列中调取一个任务
    //2.分类任务，如果不是sharedWorker处理,则派遣给leader处理.如果是sharedWorker处理，则直接派遣给sharedWorker处理
    //3.允许同时处理任务,同时处理的任务数量不能超过MAX_CONCURRENCY
    //4.只有任务处理完成(成功或者报错)后，从队列中清理这个任务.否则,任务会一直存在于队列中
    //5.任务完成后，会postMessage通知tab任务完成
    //6.当发送任务的tab关闭后，任务会被直接清理(TODO:考虑记录日志)
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

  private register() {
    globalThis.addEventListener("connect", (e: MessageEvent) => {
      const port = e.ports[0];
      //todo,永远累加
      const tab = {
        id: "tab" + this.tabs.length,
        prot: port,
      };
      this.tabs.push(tab);
      this.handleMessage(tab);
    });
  }
}

const tabManager = new TabManager();
