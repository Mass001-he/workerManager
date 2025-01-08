import { Logger } from '../../logger';
import {
  MessageType,
  type SharedWorkerGlobalScope,
  type RequestPayload,
  type DispatchResponsePayload,
  type NoResRequestPayload,
  DispatchRequestPayload,
  type Prettier,
} from '../types';
import { SchedulerAction, TabAction } from './constant';
import { EventQueue } from './eventQueue';
import { LeaderElection } from './leaderElection';
import { TabManager } from './tabManager';

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;
export type SchedulerEventQueueTask = Prettier<
  RequestPayload & { tabId: string }
>;

export class Scheduler {
  private tabManager: TabManager;
  private leaderElection: LeaderElection;
  private eventQueue: EventQueue<SchedulerEventQueueTask>;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope('Scheduler');
  private dispatchMap = new Map<string, SchedulerEventQueueTask>();

  constructor() {
    this.logger.info('created').print();
    this.tabManager = new TabManager();
    this.leaderElection = new LeaderElection();
    this.eventQueue = new EventQueue({
      filter(item, task) {
        return item.reqId === task.reqId;
      },
    });
    this.register();
  }

  private onDispatchResponse = (e: MessageEvent<DispatchResponsePayload>) => {
    const payload = e.data;
    this.logger.info('onDispatchResponse', payload).print();
    const reqId = payload.reqId;
    const task = this.dispatchMap.get(reqId);
    if (task === undefined) {
      this.logger.warn('task not found', reqId, this.dispatchMap).print();
      return;
    }
    const tab = this.tabManager.getTabById(task.tabId);
    if (tab === undefined) {
      this.logger
        .warn('The responder was not found', task, payload, '')
        .print();
    } else {
      this.tabManager.postMessage({
        tab,
        message: {
          ...payload,
          type: MessageType.Response,
        },
      });
    }

    this.eventQueue.completeTask({
      reqId: payload.reqId,
    });
    this.dispatchMap.delete(reqId);
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
      case SchedulerAction.Destroy:
        if (tabId === this.leaderElection.leader && !!tabId) {
          this.leaderElection.abdicate();
        }
        this.tabManager.removeTab(tabId);
      default:
        break;
    }
  };

  private registerTabManager() {
    this.logger.info('register tab manager').print();

    this.tabManager.onMessage((message) => {
      const { event, tabId } = message;
      const payload = event.data;
      switch (payload.type) {
        case MessageType.Request:
          this.eventQueue.enqueue({
            ...(payload as RequestPayload),
            tabId,
          });
          break;
        case MessageType.DispatchResponse:
          this.onDispatchResponse(
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
          this.logger.warn('unknown message', message).print();
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
            id: e.id,
          },
        },
      });
    });

    this.destroyFn.push(() => {
      this.tabManager.destroy();
    });
  }

  private register() {
    this.logger.info('register tab connect').print();
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
    this.logger.info('register leader election').print();
    this.leaderElection.onNoCandidate(() => {
      this.leaderElection.campaign(this.tabManager.tabs[0].id);
    });
    this.leaderElection.onLeaderChange(() => {
      this.tabManager.broadcastMessage({
        type: MessageType.Notice,
        data: {
          action: TabAction.LeaderChange,
          id: this.leaderElection.leader,
        },
      });
      this.eventQueue.reActivation();
    });
    this.destroyFn.push(() => {
      this.leaderElection.destroy();
    });
  }

  private registerEventQueue() {
    this.logger.info('register event queue').print();
    this.eventQueue.onTaskActivation((ev) => {
      const { tasks } = ev;
      if (this.leaderElection.leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader').print();
        this.leaderElection.electLeader();
        return;
      }
      const leader = this.tabManager.getTabById(this.leaderElection.leader);
      if (leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader').print();
        this.leaderElection.electLeader();
        return;
      }

      tasks.forEach((task) => {
        if (this.dispatchMap.has(task.reqId) === false) {
          this.dispatchMap.set(task.reqId, task);
        }
      });

      this.tabManager.postMessage<DispatchRequestPayload>({
        tab: leader,
        message: {
          type: MessageType.DispatchRequest,
          data: {
            tasks,
          },
        },
      });
    });

    this.destroyFn.push(() => {
      this.eventQueue.destroy();
    });
  }

  public destroy() {
    this.logger.info('destroy').print();
    this.destroyFn.forEach((fn) => fn());
  }
}
