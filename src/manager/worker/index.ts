import { Emitter } from "../../event";
import { Logger } from "../../logger";
import {
  MessageType,
  type ReqId,
  type RequestPayload,
  type ResponsePayload,
  type SharedWorkerGlobalScope,
} from "../types";
import { SchedulerDefReqId } from "../utils";
import { EventQueue } from "./eventQueue";
import { LeaderElection } from "./leaderElection";
import { TabManager } from "./tabManager";

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;

export class Scheduler {
  private tabManager: TabManager;
  private leaderElection: LeaderElection;
  private eventQueue: EventQueue;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope("Center");
  private resEventMap = new Map<ReqId, Emitter<any>>();

  constructor() {
    this.logger.info("Center created");
    this.tabManager = new TabManager();
    this.leaderElection = new LeaderElection();
    this.eventQueue = new EventQueue();
    this.register();
  }

  private onTabResponse = (e: MessageEvent<ResponsePayload>) => {
    const payload = e.data;
    const emitter = this.resEventMap.get(payload.reqId);
    if (emitter === undefined) {
      this.logger.warn("response event not found", payload);
      return;
    }
    emitter.fire(payload);
  };

  private register() {
    this.logger.info("register tab connect");
    const handleConnect = (e: MessageEvent) => {
      const port = e.ports[0];
      const tabId = this.tabManager.addTab(port);
      const handle = (e: MessageEvent<RequestPayload | ResponsePayload>) => {
        const payload = e.data;
        switch (payload.type) {
          case MessageType.TAB_REQUEST:
            this.eventQueue.enqueue(tabId, payload);
            break;
          case MessageType.TAB_RESPONSE:
            this.onTabResponse(e as MessageEvent<ResponsePayload>);
            break;
          default:
            break;
        }
      };

      port.addEventListener("message", handle);
      this.destroyFn.push(() => {
        port.removeEventListener("message", handle);
      });
    };

    globalThis.addEventListener("connect", handleConnect);

    this.destroyFn.push(() => {
      //@ts-ignore
      globalThis.removeEventListener("connect", handleConnect);
    });

    this.registerLeaderElection();
    this.registerTabManager();
    this.registerEventQueue();
  }

  private registerLeaderElection() {
    this.logger.info("register leader election");
    this.leaderElection.onNoCandidate(() => {
      this.leaderElection.campaign(this.tabManager.tabs[0]);
    });
    this.leaderElection.onLeaderChange(() => {
      this.eventQueue.reActivation();
    });
    this.destroyFn.push(() => {
      this.leaderElection.destroy();
    });
  }

  private registerTabManager() {
    this.logger.info("register tab manager");

    this.tabManager.onMessage((e) => {
      this.eventQueue.enqueue(e.tabId, e.message);
    });

    this.tabManager.onTabAdded((e) => {
      const tab = this.tabManager.getTabById(e.id);
      tab?.prot.postMessage({
        success: true,
        type: MessageType.CONNECTED,
        reqId: SchedulerDefReqId,
      } as ResponsePayload);
    });

    this.destroyFn.push(() => {
      this.tabManager.destroy();
    });
  }

  private registerEventQueue() {
    this.logger.info("register event queue");
    this.eventQueue.onTaskActivation((e) => {
      const { task, completeTask } = e;
      const tab = this.tabManager.getTabById(task.tabId);
      if (tab === undefined) {
        this.logger.warn("tab not found", task);
      }
      if (this.leaderElection.leader === undefined) {
        this.logger.warn("leader not found", task, "re elect leader");
        this.leaderElection.electLeader();
        return;
      }

      if (this.resEventMap.has(task.payload.reqId)) {
        //如果已经存在对应的响应事件,则销毁。例如tab关闭，重新选举leader后，之前的响应事件将不再需要
        const emitter = this.resEventMap.get(task.payload.reqId)!;
        emitter.dispose();
        this.resEventMap.delete(task.payload.reqId);
      }

      const emitter = new Emitter<any>();
      this.resEventMap.set(task.payload.reqId, emitter);

      emitter.event((e) => {
        if (tab) {
          this.tabManager.postMessage(tab, e);
        }
        completeTask();
        emitter.dispose();
      });
    });

    this.destroyFn.push(() => {
      this.eventQueue.destroy();
    });
  }

  public destroy() {
    this.logger.info("destroy");
    this.destroyFn.forEach((fn) => fn());
  }
}

const scheduler = new Scheduler();
