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

  service.add('deleteMsg', ({ data }) => {
    return rpc.callRepo('user', 'removeMany', [
      {
        name: data.deleteName,
      },
      data.isHardDelete,
    ]);
  });
  service.add('exec', (sql) => rpc.exec(sql));

  service.add('search', (data) => {
    return rpc.callRepo('user', 'queryMany', data);
  });

  service.add('updateUser', (data) => {
    return rpc.callRepo('user', 'updateMany', data);
  });

  service.add('deleteUser', (data) => {
    return rpc.callRepo('user', 'removeMany', data);
  });

  service.add('test1',(data)=>{})
}
