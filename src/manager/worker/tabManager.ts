import {
  MessageType,
  type RequestPayload,
  type ResponsePayload,
  type TabDescriptor,
} from "../types";
import { Counter } from "../utils";

export class TabManager {
  public tabs: TabDescriptor[] = [];
  public tabIdCounter = new Counter();

  constructor() {}

  private getTabById(id: string) {
    return this.tabs.find((tab) => tab.id === id);
  }

  private getTabIndexById(id: string) {
    return this.tabs.findIndex((t) => t.id === id);
  }

  private handleMessage(tab: TabDescriptor) {
    const { prot } = tab;
    prot.addEventListener("message", (e: MessageEvent) => {
      const message = e.data as RequestPayload;
      this.center.eventQueue.enqueue(tab.id, message);
    });
  }

  private onTabDestroy(tab: TabDescriptor) {
    const idx = this.getTabIndexById(tab.id);
    if (idx !== -1) {
      this.tabs.splice(idx, 1);
      if (this.center.leaderElection.leader === tab) {
        this.center.leaderElection.electLeader();
      }
    }
  }

  public postMessage(tab: TabDescriptor, message: ResponsePayload) {
    tab.prot.postMessage(message);
  }

  public addTab(tab: TabDescriptor) {
    this.tabs.push(tab);
    this.handleMessage(tab);
    this.postMessage(tab, { success: true, type: MessageType.CONNECTED });
  }
}
