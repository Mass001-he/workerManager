import * as Comlink from 'comlink';
import './db/orm/column';
import { rpcType } from './dbServer';

export async function createWorker() {
  let worker = new Worker(new URL('./dbServer.ts', import.meta.url), {
    name: 'db',
    type: 'module',
  });

  let rpc = Comlink.wrap<rpcType>(worker);

  return {
    rpc,
    close: () => {
      worker.terminate();
      //@ts-ignore
      worker = null;
      //@ts-ignore
      rpc = null;
    },
  };
}
