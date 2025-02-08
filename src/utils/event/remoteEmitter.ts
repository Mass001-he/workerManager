import { Emitter } from './emitter';
import type { IEvent } from './types';
import { safeRandomUUID } from './utils';

export enum InnerMessageType {
  RemoteEmitterDispose,
}

export type InnerMessage = {
  type: InnerMessageType;
};

export interface WebRemoteEmitterOptions {
  eventName: string;
  /**
   * @description `fire`是否同步触发给本地，如果为`true`，则在`fire`时触发本地事件，意味着可以统一监听事件流程。
   */
  syncData?: boolean;
}

export class WebRemoteEmitter<T = void> {
  /**
   * @description Used to identify the current instance
   */
  public id = safeRandomUUID();
  /**
   * @description The name of the event
   */
  public eventName: string;
  public syncData: boolean;
  private emitter = new Emitter<T>();
  private dataChannel: BroadcastChannel;
  private innerDataChannel: BroadcastChannel;

  constructor(options: WebRemoteEmitterOptions) {
    const { eventName, syncData } = options;
    this.eventName = eventName;
    this.syncData = syncData || false;
    this.dataChannel = new BroadcastChannel(`nc_data_${eventName}`);
    this.innerDataChannel = new BroadcastChannel(`nc_inner_data_${eventName}`);
    this._setupMessageListener();
  }

  private _setupMessageListener() {
    this.dataChannel.onmessage = (event) => {
      this._handleMessage(event.data);
    };
    this.innerDataChannel.onmessage = (event) => {
      this._handleInnerMessage(event.data);
    };
  }
  private _handleInnerMessage = (message: InnerMessage) => {
    switch (message.type) {
      case InnerMessageType.RemoteEmitterDispose:
        this.dispose(false);
        break;
      default:
        console.error('Unknown message type:', message.type);
        throw new Error('Unknown message type');
    }
  };
  private _handleMessage = (data: T) => {
    this.emitter.fire(data);
  };
  public get event(): IEvent<T> {
    return this.emitter.event;
  }
  public fire(data: T): void {
    this.dataChannel.postMessage(data);
    if (this.syncData) {
      this.emitter.fire(data);
    }
  }
  public dispose(sync = false): void {
    console.log('WebRemoteEmitter:dispose', {
      id: this.id,
      sync: sync,
      eventName: this.eventName,
    });
    if (sync) {
      this.innerDataChannel.postMessage({
        type: InnerMessageType.RemoteEmitterDispose,
      });
    }
    this.innerDataChannel.close();
    this.dataChannel.close();
    this.emitter.dispose();
  }
}
