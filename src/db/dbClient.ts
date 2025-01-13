import * as Comlink from 'comlink';
import type { DBServer } from './dbServer';
import './orm/column';

export async function createWorker() {
  let worker = new Worker(new URL('./dbServer.ts', import.meta.url), {
    name: 'db',
    type: 'module',
  });

  let rpc = Comlink.wrap<DBServer<any>>(worker);

  return {
    rpc,
    close: () => {
      worker.terminate();
      //@ts-ignore
      worker = null;
      //@ts-ignore
      WrapWorker = null;
      //@ts-ignore
      rpc = null;
    },
  };
}
