import { Scheduler } from './elect/controller';

const scheduler = new Scheduler();

declare var globalThis: SharedWorkerGlobalScope;
interface SharedWorkerGlobalScope {
  scheduler: Scheduler;
}

globalThis.scheduler = scheduler;
