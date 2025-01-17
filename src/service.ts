import { createWorker } from './dbClient';
import type { Service } from './elect/node/service';

declare global {
  interface Window {
    closeWorker: () => void;
    deleteSqlite: () => void;
  }
}

export async function registerService(service: Service) {
  service.logger.info('registerService').print();
  const { rpc, close } = await createWorker();
  window.closeWorker = close;
  window.deleteSqlite = async () => {
    close();
    const dbDirname = '.opfs-sahpool';
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(dbDirname, { recursive: true });
    for await (const element of root.entries()) {
      console.log(element[0]);
    }
    console.log('deleteSqlite success');
  };
  await rpc.connect('test.db');
  service.onDestroy(close);

  service.add('exec', (sql: string) => {
    return rpc.exec(sql);
  });
  service.add('deleteMsg', async ({ data }) => {
    // todo
  });
}
