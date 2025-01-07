import { Logger } from '../../logger';
import {
  MessageType,
  type SharedWorkerGlobalScope,
  type RequestPayload,
  type DispatchResponsePayload,
  type NoResRequestPayload,
  DispatchRequestPayload,
  type CurrentDispatchRequest,
} from '../types';
import { Counter } from '../utils';
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
  private dispatchReqId = new Counter();
  private currentDispatchRequest: CurrentDispatchRequest = null;

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
    const { reqId, data } = payload;
    const { items } = data;
    if (this.currentDispatchRequest === null) {
      this.logger.warn('current dispatch request not found', payload);
      return;
    }
    if (reqId !== this.currentDispatchRequest.reqId) {
      this.logger.warn('reqId not match', payload);
      return;
    }
    const tasks = this.currentDispatchRequest.tasks;
    tasks.forEach((task) => {
      const item = items.find((item) => item.id === task.id);
    });

    this.eventQueue.complete();
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

      default:
        break;
    }
  };

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
          this.logger.warn('unknown message', message);
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

  private generateReqId() {
    return `dispatchReqId_${this.dispatchReqId.next()}`;
  }

  private registerEventQueue() {
    this.logger.info('register event queue');
    this.eventQueue.onTaskActivation((ev) => {
      const { tasks } = ev;
      const mergeTasks = tasks.map((task) => {
        return { tab: this.tabManager.getTabById(task.id), task };
      });
      //当client发送请求后client被关闭，此处将记录日志。
      mergeTasks.forEach((mergeTask) => {
        if (mergeTask.tab === undefined) {
          this.logger.warn('tab not found', mergeTask);
        }
      });
      if (this.leaderElection.leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader');
        this.leaderElection.electLeader();
        return;
      }
      const leader = this.tabManager.getTabById(this.leaderElection.leader);
      if (leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader');
        this.leaderElection.electLeader();
        return;
      }
      const dispatchReqId = this.generateReqId();

      if (this.currentDispatchRequest !== null) {
        //如果已经存在对应的响应事件,则销毁。例如tab关闭，重新选举leader后，之前的响应事件将不再需要
        this.logger.warn(
          'destroy current dispatch request',
          this.currentDispatchRequest,
        );
      }
      this.currentDispatchRequest = {
        reqId: dispatchReqId,
        tasks,
      };
      this.tabManager.postMessage<DispatchRequestPayload>({
        tab: leader,
        message: {
          type: MessageType.DispatchRequest,
          reqId: dispatchReqId,
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
    this.logger.info('destroy');
    this.destroyFn.forEach((fn) => fn());
  }
}
