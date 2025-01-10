import { Scheduler } from './vertex/controller';

const scheduler = new Scheduler();

declare var globalThis: SharedWorkerGlobalScope;
interface SharedWorkerGlobalScope {
  scheduler: Scheduler;
}

globalThis.scheduler = scheduler;
