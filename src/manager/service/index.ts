import { Logger } from '../../logger';
export interface ServiceHandler<P = any, R = any> {
  (args: P): R;
}

class Server {
  private logger = Logger.scope('Server');
  private serverMap: Map<string, ServiceHandler> = new Map();

  constructor() {
    this.logger.info('constructor');
  }

  getService(serviceName: string) {
    this.logger.info('getService', serviceName);
    const handler = this.serverMap.get(serviceName);
    if (!handler) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return handler;
  }

  addService<P = any, R = any>(
    serviceName: string,
    handle: ServiceHandler<P, R>,
  ) {
    this.logger.info('createService', serviceName);
    this.serverMap.set(serviceName, handle);
  }

  destroy() {
    this.logger.info('destroy');
    this.serverMap.clear();
  }
}

export default Server;
