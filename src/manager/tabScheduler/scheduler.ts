import { Emitter } from '../../event';
import { Logger } from '../../logger';
import {
  MessageType,
  type ReqId,
  type SharedWorkerGlobalScope,
  type RequestPayload,
  type DispatchResponsePayload,
  type NoResRequestPayload,
  type ResponsePayload,
  DispatchRequestPayload,
} from '../types';
import { SchedulerAction, TabAction } from './constant';
import { EventQueue } from './eventQueue';
import { LeaderElection } from './leaderElection';
import { TabManager } from './tabManager';

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;

export class Scheduler {
  private tabManager: TabManager;
  private leaderElection: LeaderElection;
  private eventQueue: EventQueue;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope('Scheduler');
  private resEventMap = new Map<ReqId, Emitter<any>>();

  constructor() {
    this.logger.info('created');
    this.tabManager = new TabManager();
    this.leaderElection = new LeaderElection();
    this.eventQueue = new EventQueue();
    this.register();
  }

  private onDispatchResponse = (
    tabId: string,
    e: MessageEvent<DispatchResponsePayload>,
  ) => {
    const payload = e.data;
    this.logger.info('onDispatchResponse', {
      tabId,
      payload,
    });
    const emitter = this.resEventMap.get(payload.reqId);
    if (emitter === undefined) {
      this.logger.warn('response event not found', payload);
      return;
    }
    emitter.fire(payload);
  };

  private onNoResRequest = (
    tabId: string,
    e: MessageEvent<NoResRequestPayload>,
  ) => {
    this.logger.info('onNoResRequest', {
      tabId,
      payload: e.data,
    });
    switch (e.data.data.action) {
      case SchedulerAction.Campaign:
        this.leaderElection.campaign(tabId);
        break;

      default:
        break;
    }
  };

  private register() {
    this.logger.info('register tab connect');
    const handleConnect = (e: MessageEvent) => {
      const port = e.ports[0];
      port.start();
      this.tabManager.addTab(port);
    };

    globalThis.addEventListener('connect', handleConnect);

    this.destroyFn.push(() => {
      //@ts-ignore
      globalThis.removeEventListener('connect', handleConnect);
    });

    this.registerLeaderElection();
    this.registerTabManager();
    this.registerEventQueue();
  }

  private registerLeaderElection() {
    this.logger.info('register leader election');
    this.leaderElection.onNoCandidate(() => {
      this.leaderElection.campaign(this.tabManager.tabs[0].id);
    });
    this.leaderElection.onLeaderChange(() => {
      this.eventQueue.reActivation();
    });
    this.destroyFn.push(() => {
      this.leaderElection.destroy();
    });
  }

  private registerTabManager() {
    this.logger.info('register tab manager');

    this.tabManager.onMessage((message) => {
      const { event, tabId } = message;
      const payload = event.data;
      switch (payload.type) {
        case MessageType.Request:
          this.eventQueue.enqueue(tabId, payload as RequestPayload);
          break;
        case MessageType.DispatchResponse:
          this.onDispatchResponse(
            tabId,
            event as MessageEvent<DispatchResponsePayload>,
          );
          break;
        case MessageType.NoResRequest:
          this.onNoResRequest(
            tabId,
            event as MessageEvent<NoResRequestPayload>,
          );
          break;
        default:
          break;
      }
    });

    this.tabManager.onTabAdded((e) => {
      const tab = this.tabManager.getTabById(e.id);
      this.tabManager.postMessage({
        tab,
        message: {
          type: MessageType.Notice,
          data: {
            action: TabAction.Connected,
          },
        },
      });
    });

    this.destroyFn.push(() => {
      this.tabManager.destroy();
    });
  }

  private registerEventQueue() {
    this.logger.info('register event queue');
    this.eventQueue.onTaskActivation((e) => {
      const { task, completeTask } = e;
      const tab = this.tabManager.getTabById(task.tabId);
      if (tab === undefined) {
        this.logger.warn('tab not found', task);
      }
      if (this.leaderElection.leader === undefined) {
        this.logger.warn('leader not found', task, 're elect leader');
        this.leaderElection.electLeader();
        return;
      }

      if (this.resEventMap.has(task.payload.reqId)) {
        //如果已经存在对应的响应事件,则销毁。例如tab关闭，重新选举leader后，之前的响应事件将不再需要
        const emitter = this.resEventMap.get(task.payload.reqId)!;
        emitter.dispose();
        this.resEventMap.delete(task.payload.reqId);
      }

      const emitter = new Emitter<ResponsePayload>();
      this.resEventMap.set(task.payload.reqId, emitter);

      emitter.event((e) => {
        this.tabManager.postMessage({ tab, message: e });
        completeTask();
        emitter.dispose();
        this.resEventMap.delete(task.payload.reqId);
      });

      this.tabManager.postMessage<DispatchRequestPayload>({
        tab,
        message: {
          type: MessageType.DispatchRequest,
          reqId: task.payload.reqId,
          data: task.payload.data,
        },
      });
    });

    this.destroyFn.push(() => {
      this.eventQueue.destroy();
    });
  }

  public destroy() {
    this.logger.info('destroy');
    this.destroyFn.forEach((fn) => fn());
  }
}
