import { Emitter, Logger } from '../../utils';
import {
  MessageType,
  type PayloadLike,
  type TabNodeDescriptor,
} from '../types';
import { Counter } from '../../utils';
import type { NodeAction } from './constant';

export class TabNodeManager {
  public nodes: TabNodeDescriptor[] = [];
  public nodeIdCounter = new Counter();
  private logger = Logger.scope('TabManager');

  private _onMessage = new Emitter<{
    nodeId: string;
    event: MessageEvent<PayloadLike>;
  }>();
  private _onNodeAdded = new Emitter<TabNodeDescriptor>();
  public onMessage = this._onMessage.event;
  public onNodeAdded = this._onNodeAdded.event;

  constructor() {
    this.logger.info('Created').print();
  }

  public getNodeById(id: string) {
    const result = this.nodes.find((node) => node.id === id);
    if (!result) {
      throw new Error(`Node not found: ${id}`);
    }
    return result;
  }

  public getNodeByPort(port: MessagePort) {
    const result = this.nodes.find((node) => node.prot === port);
    if (!result) {
      throw new Error(`Node not found: ${port}`);
    }
    return result;
  }

  public getNodeIndexById(id: string) {
    const result = this.nodes.findIndex((t) => t.id === id);
    if (result < 0) {
      throw new Error(`Node not found: ${id}`);
    }
    return result;
  }

  private handleMessage = (nodeId: string, ev: MessageEvent<PayloadLike>) => {
    this._onMessage.fire({
      nodeId,
      event: ev,
    });
  };

  public postMessage<T extends PayloadLike>(options: {
    node?: TabNodeDescriptor;
    message: T;
  }) {
    const { node, message } = options;
    node?.prot.postMessage(message);
  }

  /**
   * 广播消息
   */
  public broadcastMessage<T extends Record<string, any>>(
    data: T,
    exclude?: string[],
  ) {
    this.logger.info('broadcastMessage', { data, exclude }).print();
    for (const node of this.nodes) {
      if (exclude && exclude.includes(node.id)) {
        continue;
      }
      this.postMessage({
        node,
        message: {
          type: MessageType.Broadcast,
          data,
        },
      });
    }
  }

  /**
   * 广播通知
   */
  public broadcastNotice(action: NodeAction, excludeIds: string[] = []) {
    this.logger.info('broadcastNotice', action).print();
    for (const node of this.nodes) {
      if (excludeIds.includes(node.id)) {
        continue;
      }
      this.postMessage({
        node,
        message: {
          type: MessageType.SchedulerNotice,
          data: {
            action: action,
          },
        },
      });
    }
  }

  public addTab(tabPort: MessagePort) {
    const node = {
      id: 'node' + this.nodeIdCounter.next(),
      prot: tabPort,
    };
    this.logger.info('add Node', node).print();
    this.nodes.push(node);
    tabPort.addEventListener('message', (ev) =>
      this.handleMessage(node.id, ev),
    );
    this._onNodeAdded.fire(node);
    return node.id;
  }

  public removeTab(id: string) {
    this.logger.info('removeTab', id).print();
    const idx = this.getNodeIndexById(id);
    if (idx !== -1) {
      this.logger.info('removeTab', { id, idx }).print();
      this.nodes.splice(idx, 1);
    }
  }

  public destroy() {
    this.logger.info('destroy').print();
    for (const node of this.nodes) {
      node.prot.close();
    }
    this.nodes = [];
    this._onMessage.dispose();
    this._onNodeAdded.dispose();
  }
}
