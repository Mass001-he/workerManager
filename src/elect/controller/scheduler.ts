import { Logger } from '../../utils';
import {
  MessageType,
  type SharedWorkerGlobalScope,
  type ServiceRequestPayload,
  type DispatchResponsePayload,
  type DispatchRequestPayload,
  type NodeNoticePayload,
  type RequestPayload,
} from '../types';
import { NodeAction, SchedulerAction } from './constant';
import { EventQueue } from './eventQueue';
import { Council } from './council';
import { TabNodeManager } from './nodeManager';
import { Prettier } from '../../utils.type';

declare var self: SharedWorkerGlobalScope;
declare var globalThis: typeof self;
export type SchedulerEventQueueTask = Prettier<
  ServiceRequestPayload & { nodeId: string }
>;

export class Scheduler {
  private nodeManager: TabNodeManager;
  private council: Council;
  private eventQueue: EventQueue<SchedulerEventQueueTask>;
  private destroyFn: Array<() => void> = [];
  private logger = Logger.scope('Scheduler');
  private dispatchMap = new Map<string, SchedulerEventQueueTask>();

  constructor() {
    this.logger.info('Created').print();
    this.nodeManager = new TabNodeManager();
    this.council = new Council();
    this.eventQueue = new EventQueue({
      filter(item, task) {
        const itemUniqueId = item.nodeId + item.reqId;
        const taskUniqueId = task.nodeId + task.reqId;

        return itemUniqueId === taskUniqueId;
      },
    });
    this.register();
  }

  private onDispatchResponse = (
    nodeId: string,
    e: MessageEvent<DispatchResponsePayload>,
  ) => {
    const payload = e.data;
    this.logger
      .info(
        `onDispatchResponse,handler nodeId: ${nodeId},targetId:${payload.targetNodeId}`,
        payload,
      )
      .print();
    const uniqueId = payload.targetNodeId + payload.reqId;
    const task = this.dispatchMap.get(uniqueId);
    if (task === undefined) {
      this.logger.warn('task not found', uniqueId, this.dispatchMap).print();
      return;
    }
    const node = this.nodeManager.getNodeById(task.nodeId);
    if (node === undefined) {
      this.logger
        .warn('The responder was not found', task, payload, '')
        .print();
    } else {
      this.nodeManager.postMessage({
        node,
        message: {
          ...payload,
          type: MessageType.ServiceResponse,
        },
      });
    }

    this.eventQueue.completeTask(task);
    this.dispatchMap.delete(uniqueId);
  };

  private onNodeNotice = (
    nodeId: string,
    e: MessageEvent<NodeNoticePayload>,
  ) => {
    this.logger.info('onNodeNotice', {
      nodeId,
      payload: e.data,
    });
    switch (e.data.data.action) {
      case NodeAction.Campaign:
        this.council.campaign(nodeId);
        break;
      case NodeAction.Destroy:
        if (nodeId === this.council.leader && !!nodeId) {
          this.council.abdicate();
        }
        this.nodeManager.removeTab(nodeId);
        break;
      case NodeAction.UpperReady:
        this.eventQueue.reActivation();
        this.nodeManager.broadcastNotice(NodeAction.LeaderChange, [nodeId]);
        break;
      default:
        this.logger.error('unknown action', e.data.data.action).print();
        break;
    }
  };

  private handleRequest(nodeId: string, payload: RequestPayload) {
    this.logger.info('handleRequest', payload).print();
    const actionType = payload.data.action;
    const node = this.nodeManager.getNodeById(nodeId);

    switch (actionType) {
      case SchedulerAction.TakeOffice:
        const result = this.council.takeOffice(nodeId);
        this.nodeManager.postMessage({
          node,
          message: {
            type: MessageType.Response,
            reqId: payload.reqId,
            success: true,
            data: {
              action: SchedulerAction.TakeOffice,
              result,
            },
          },
        });
        break;
      default:
        this.logger.warn('unknown action', actionType).print();
        break;
    }
  }

  private registerTabManager() {
    this.logger.info('register tab manager').print();

    this.nodeManager.onMessage((message) => {
      this.logger.info('onMessage', message).print();
      const { event, nodeId } = message;
      const payload = event.data;
      switch (payload.type) {
        case MessageType.ServiceRequest:
          this.eventQueue.enqueue({
            ...(payload as ServiceRequestPayload),
            nodeId,
          });
          break;
        case MessageType.Request:
          this.handleRequest(nodeId, payload as RequestPayload);
          break;
        case MessageType.Broadcast:
          this.nodeManager.broadcastMessage(
            {
              ...payload.data,
              sender: nodeId,
            },
            payload.toSelf ? undefined : [nodeId],
          );
          break;
        case MessageType.DispatchResponse:
          this.onDispatchResponse(
            nodeId,
            event as MessageEvent<DispatchResponsePayload>,
          );
          break;
        case MessageType.NodeNotice:
          this.onNodeNotice(nodeId, event as MessageEvent<NodeNoticePayload>);
          break;
        default:
          this.logger.warn('unknown message', message).print();
          break;
      }
    });

    this.destroyFn.push(() => {
      this.nodeManager.destroy();
    });
  }

  private register() {
    this.logger.info('register tab connect').print();
    const handleConnect = (e: MessageEvent) => {
      const port = e.ports[0];
      port.start();
      this.nodeManager.addTab(port);
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
      this.council.campaign(this.nodeManager.nodes[0].id);
    });
    this.council.onCompletionToElection((data) => {
      const node = this.nodeManager.getNodeById(data.candidate);
      node.prot.postMessage({
        type: MessageType.SchedulerNotice,
        data: {
          action: NodeAction.CompletionToElection,
          id: data.candidate,
        },
      });
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
      const leader = this.nodeManager.getNodeById(this.council.leader);
      if (leader === undefined) {
        this.logger.warn('leader not found', tasks, 're elect leader').print();
        this.council.electLeader();
        return;
      }

      tasks.forEach((task) => {
        const uniqueId = task.nodeId + task.reqId;
        if (this.dispatchMap.has(uniqueId) === false) {
          this.dispatchMap.set(uniqueId, task);
        }
      });

      this.nodeManager.postMessage<DispatchRequestPayload>({
        node: leader,
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
