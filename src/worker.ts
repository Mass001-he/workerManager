import { Scheduler } from './vertex/controller';
import { OPFS } from './fs';

// const scheduler = new Scheduler();

// declare var globalThis: SharedWorkerGlobalScope;
// interface SharedWorkerGlobalScope {
//   scheduler: Scheduler;
// }

// globalThis.scheduler = scheduler;

async function main() {
  const fs = await OPFS.create();
}

main();
