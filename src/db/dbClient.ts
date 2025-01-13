import * as Comlink from 'comlink';
import type { DBServerClassType } from './dbServer';
import './orm/column';
import { type Table } from './orm/column';

export async function createWorker<T extends Table[]>(tables: T) {
  let worker = new Worker(new URL('./dbServer.ts', import.meta.url), {
    name: 'db',
    type: 'module',
  });

  let WrapWorker = Comlink.wrap<DBServerClassType>(worker);
  let rpc = await new WrapWorker(tables);

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
