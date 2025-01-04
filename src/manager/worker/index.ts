import { Logger } from "../../logger";
import { type SharedWorkerGlobalScope } from "../types";
import { EventQueue } from "./eventQueue";
import { LeaderElection } from "./leaderElection";
import { TabManager } from "./tabManager";

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;

class Center {
  private tabManager: TabManager;
  private leaderElection: LeaderElection;
  private eventQueue: EventQueue;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope("Center");

  constructor() {
    this.logger.info("Center created");
    this.tabManager = new TabManager();
    this.leaderElection = new LeaderElection();
    this.eventQueue = new EventQueue();
    this.register();
  }

  private register() {
    this.logger.info("register tab connect");
    const handleConnect = (e: MessageEvent) => {
      const port = e.ports[0];
      this.tabManager.addTab(port);
      const handle = (e: MessageEvent) => {
        const { tabId, payload } = e.data;
        this.eventQueue.enqueue(tabId, payload);
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
      this.eventQueue.processQueue();
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

    this.destroyFn.push(() => {
      this.tabManager.destroy();
    });
  }

  private registerEventQueue() {
    this.logger.info("register event queue");

    this.destroyFn.push(() => {
      this.eventQueue.destroy();
    });
  }

  public destroy() {
    this.logger.info("destroy");
    this.destroyFn.forEach((fn) => fn());
  }
}

const center = new Center();
