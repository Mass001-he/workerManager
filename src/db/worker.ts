import initSqlite3, { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
import { Action, Status } from './utils/constant';

let sqliteDB: OpfsSAHPoolDatabase;

self.onmessage = async (event) => {
  const { action, payload } = event.data;

  if (action === Action.initDB) {
    initDB();
  }
};

async function initDB() {
  try {
    const sqlite3 = await initSqlite3();

    // 安装 OPFS VFS
    try {
      // pollUtil 为可用于执行文件池的基本管理的实用程序对象
      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
        clearOnInit: false,
        initialCapacity: 6,
        directory: '/sqlite3',
        name: 'opfs-sahpool',
      });
      console.log('OPFS VFS installed:', poolUtil);

      sqliteDB = new poolUtil.OpfsSAHPoolDb(`/comms.db`);
      console.log('sqliteDB=====>', sqliteDB);

      // 将数据库实例传递给主线程
      self.postMessage({
        action: Action.dbReady,
        status: Status.success,
        result: sqliteDB,
      });
    } catch (error) {
      console.error('Failed to install OPFS VFS:', error);
      return;
    }

    // const db = new sqlite3.oo1.OpfsDb('/my-database.sqlite3');
  } catch (error: any) {
    self.postMessage({
      action: Action.initDBError,
      status: Status.error,
      error: error?.message,
    });
  }
}
