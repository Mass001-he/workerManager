import * as Comlink from 'comlink';
import type { DBServerClassType } from './dbServer';
import './orm/column';

export async function createWorker() {
  let worker = new Worker(new URL('./dbServer.ts', import.meta.url), {
    name: 'db',
    type: 'module',
  });

  let WrapWorker = Comlink.wrap<DBServerClassType>(worker);
  let dbClient = await new WrapWorker([]);

  return {
    dbClient,
    close: () => {
      worker.terminate();
      //@ts-ignore
      worker = null;
      //@ts-ignore
      WrapWorker = null;
      //@ts-ignore
      dbClient = null;
    },
  };
}
