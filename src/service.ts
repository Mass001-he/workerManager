import { createWorker } from './db/dbClient';
import type { Service } from './vertex/node/service';

declare global {
  interface Window {
    closeWorker: () => void;
  }
}

export async function registerService(service: Service) {
  service.logger.info('registerService');
  const { rpc, close } = await createWorker([]);
  window.closeWorker = close;
  await rpc.connect('test.db');
  service.onDestroy(close);
}
