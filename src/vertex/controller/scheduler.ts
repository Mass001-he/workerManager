import { Logger } from '../utils';
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
import { Council } from './council';
import { TabManager } from './tabManager';

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;
export type SchedulerEventQueueTask = Prettier<
  RequestPayload & { tabId: string }
>;

export class Scheduler {
  private tabManager: TabManager;
  private council: Council;
  private eventQueue: EventQueue<SchedulerEventQueueTask>;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope('Scheduler');
  private dispatchMap = new Map<string, SchedulerEventQueueTask>();

  constructor() {
    this.logger.info('created').print();
    this.tabManager = new TabManager();
    this.council = new Council();
    this.eventQueue = new EventQueue({
      filter(item, task) {
        return item.reqId === task.reqId;
      },
    });
    this.register();
  }

  private onDispatchResponse = (
    tabId: string,
    e: MessageEvent<DispatchResponsePayload>,
  ) => {
    const payload = e.data;
    this.logger.info(`onDispatchResponse,tabId:${tabId}`, payload).print();
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
        this.council.campaign(tabId);
        break;
      case SchedulerAction.Destroy:
        if (tabId === this.council.leader && !!tabId) {
          this.council.abdicate();
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
        case MessageType.Broadcast:
          this.tabManager.broadcastMessage(
            {
              ...payload.data,
              sender: tabId,
            },
            payload.toSelf ? undefined : [tabId],
          );
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

    this.registerCouncil();
    this.registerTabManager();
    this.registerEventQueue();
  }

  private registerCouncil() {
    this.logger.info('register council').print();
    this.council.onNoCandidate(() => {
      this.council.campaign(this.tabManager.tabs[0].id);
    });
    this.council.onLeaderChange(() => {
      this.tabManager.broadcastMessage({
        type: MessageType.Notice,
        data: {
          action: TabAction.LeaderChange,
          id: this.council.leader,
        },
      });
      this.eventQueue.reActivation();
    });
    this.destroyFn.push(() => {
      this.council.destroy();
    });
  }

  private registerEventQueue() {
    this.logger.info('register event queue').print();
    this.eventQueue.onTaskActivation((ev) => {
      const { tasks } = ev;
      if (this.council.leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader').print();
        this.council.electLeader();
        return;
      }
      const leader = this.tabManager.getTabById(this.council.leader);
      if (leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader').print();
        this.council.electLeader();
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
