import * as Comlink from 'comlink';
import type { DBServerClassType } from './dbServer';

export const DBClient = Comlink.wrap<DBServerClassType>(
  new Worker(new URL('./dbServer.ts', import.meta.url), {
    name: 'db',
    type: 'module',
  }),
);
