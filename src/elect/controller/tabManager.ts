import { Emitter, Logger } from '../../utils';
import { MessageType, type PayloadLike, type TabDescriptor } from '../types';
import { Counter } from '../../utils';

export class TabManager {
  public tabs: TabDescriptor[] = [];
  public tabIdCounter = new Counter();
  private logger = Logger.scope('TabManager');

  private _onMessage = new Emitter<{
    tabId: string;
    event: MessageEvent<PayloadLike>;
  }>();
  private _onTabAdded = new Emitter<TabDescriptor>();
  public onMessage = this._onMessage.event;
  public onTabAdded = this._onTabAdded.event;

  constructor() {
    this.logger.info('Created').print();
  }

  public getTabById(id: string) {
    return this.tabs.find((tab) => tab.id === id);
  }

  public getTabIndexById(id: string) {
    return this.tabs.findIndex((t) => t.id === id);
  }

  private handleMessage = (tabId: string, ev: MessageEvent<PayloadLike>) => {
    this._onMessage.fire({
      tabId,
      event: ev,
    });
  };

  public postMessage<T extends PayloadLike>(options: {
    tab?: TabDescriptor;
    message: T;
  }) {
    const { tab, message } = options;
    tab?.prot.postMessage(message);
  }

  /**
   * 广播消息
   */
  public broadcastMessage<T extends Record<string, any>>(
    data: T,
    exclude?: string[],
  ) {
    this.logger.info('broadcastMessage', { data, exclude }).print();
    for (const tab of this.tabs) {
      if (exclude && exclude.includes(tab.id)) {
        continue;
      }
      this.postMessage({
        tab,
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
  public broadcastNotice<T extends Record<string, any>>(data: T) {
    this.logger.info('broadcastNotice', data).print();
    for (const tab of this.tabs) {
      this.postMessage({
        tab,
        message: {
          type: MessageType.Notice,
          data,
        },
      });
    }
  }

  public addTab(tabPort: MessagePort) {
    const tab = {
      id: 'tab' + this.tabIdCounter.next(),
      prot: tabPort,
    };
    this.logger.info('addTab', tab).print();
    this.tabs.push(tab);
    tabPort.addEventListener('message', (ev) => this.handleMessage(tab.id, ev));
    this._onTabAdded.fire(tab);
    return tab.id;
  }

  public removeTab(id: string) {
    this.logger.info('removeTab', id).print();
    const idx = this.getTabIndexById(id);
    if (idx !== -1) {
      this.logger.info('removeTab', { id, idx }).print();
      this.tabs.splice(idx, 1);
    }
  }

  public destroy() {
    this.logger.info('destroy').print();
    for (const tab of this.tabs) {
      tab.prot.close();
    }
    this.tabs = [];
    this._onMessage.dispose();
    this._onTabAdded.dispose();
  }
}
