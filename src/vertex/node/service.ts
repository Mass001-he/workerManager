import { Logger } from '../../utils';
export interface ServiceHandler<P = any, R = any> {
  (args: P): R;
}

export class Service {
  private logger = Logger.scope('Service');
  private serverMap: Map<string, ServiceHandler> = new Map();

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

  destroy() {
    this.logger.info('destroy').print();
    this.serverMap.clear();
  }
}
