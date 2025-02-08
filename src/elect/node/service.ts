import { Emitter, Logger } from '../../utils';
export interface ServiceHandler<P = any, R = any> {
  (args: P): R;
}

export class Service {
  public logger = Logger.scope('Service');
  private serverMap: Map<string, ServiceHandler> = new Map();
  private _onDestroy = new Emitter<void>();
  onDestroy = this._onDestroy.event;

  constructor() {
    this.logger.info('Created').print();
  }

  get(serviceName: string) {
    const handler = this.serverMap.get(serviceName);
    if (!handler) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return handler;
  }

  add<P = any, R = any>(serviceName: string, handle: ServiceHandler<P, R>) {
    this.logger.info('addService', serviceName).print();
    this.serverMap.set(serviceName, handle);
  }

  hasService() {
    return this.serverMap.size > 0;
  }

  destroy() {
    this.logger.info('destroy').print();
    this._onDestroy.fire();
    this.serverMap.clear();
  }
}
