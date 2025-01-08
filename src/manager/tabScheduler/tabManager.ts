import { Emitter } from '../../event';
import { Logger } from '../../logger';
import {
  type NoticePayload,
  type PayloadLike,
  type TabDescriptor,
} from '../types';
import { Counter } from '../utils';

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
    this.logger.info('TabManager created');
    this.onMessage((e) => {
      this.logger.info('onMessage', { id: e.tabId, data: e.event.data });
    });
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
  public broadcastMessage<T extends NoticePayload>(message: T) {
    for (const tab of this.tabs) {
      tab.prot.postMessage(message);
    }
  }

  public addTab(tabPort: MessagePort) {
    const tab = {
      id: 'tab' + this.tabIdCounter.next(),
      prot: tabPort,
    };
    this.logger.info('addTab', tab);
    this.tabs.push(tab);
    tabPort.addEventListener('message', (ev) => this.handleMessage(tab.id, ev));
    this._onTabAdded.fire(tab);
    return tab.id;
  }

  public removeTab(tab: TabDescriptor) {
    this.logger.info('removeTab', tab);
    const idx = this.getTabIndexById(tab.id);
    if (idx !== -1) {
      this.logger.info('removeTab', { tab, idx });
      this.tabs.splice(idx, 1);
    }
  }

  public destroy() {
    this.logger.info('destroy');
    for (const tab of this.tabs) {
      tab.prot.close();
    }
    this.tabs = [];
    this._onMessage.dispose();
    this._onTabAdded.dispose();
  }
}
