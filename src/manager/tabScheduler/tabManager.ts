import { Emitter } from '../../event';
import { Logger } from '../../logger';
import {
  type RequestPayload,
  type ResponsePayload,
  type TabDescriptor,
} from '../types';
import { Counter } from '../utils';

export class TabManager {
  public tabs: TabDescriptor[] = [];
  public tabIdCounter = new Counter();
  private logger = Logger.scope('TabManager');

  private _onMessage = new Emitter<{
    tabId: string;
    message: RequestPayload;
  }>();
  private _onTabAdded = new Emitter<TabDescriptor>();
  public onMessage = this._onMessage.event;
  public onTabAdded = this._onTabAdded.event;

  constructor() {
    this.logger.info('TabManager created');
    this.onMessage((e) => {
      this.logger.info('onMessage', e);
    });
  }

  public getTabById(id: string) {
    return this.tabs.find((tab) => tab.id === id);
  }

  public getTabIndexById(id: string) {
    return this.tabs.findIndex((t) => t.id === id);
  }

  private handleMessage(tab: TabDescriptor) {
    const { prot } = tab;
    prot.addEventListener('message', (e: MessageEvent) => {
      const message = e.data as RequestPayload;
      this._onMessage.fire({ tabId: tab.id, message });
    });
  }

  public postMessage(options: {
    tab?: TabDescriptor;
    message: ResponsePayload;
  }) {
    const { tab, message } = options;
    tab?.prot.postMessage(message);
  }

  public addTab(tabPort: MessagePort) {
    this.logger.info('addTab', tabPort);
    const tab = {
      id: 'tab' + this.tabIdCounter.next(),
      prot: tabPort,
    };
    this.tabs.push(tab);
    this.handleMessage(tab);
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
  }
}
