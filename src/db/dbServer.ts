import * as Comlink from 'comlink';
import initSqlite3, {
  OpfsSAHPoolDatabase,
  type SAHPoolUtil,
} from '@sqlite.org/sqlite-wasm';
import { Logger } from '../utils';

class DBServer {
  private connection: {
    poolUtil: SAHPoolUtil;
    db: OpfsSAHPoolDatabase;
  } | null = null;
  private logger: Logger = Logger.scope('DBServer');

  async connect(name: string) {
    this.logger.info('Connecting to database:', name).print();
    const sqlite3 = await initSqlite3();
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({});
    const { OpfsSAHPoolDb } = poolUtil;

    try {
      // pollUtil 为可用于执行文件池的基本管理的实用程序对象
      const db = new OpfsSAHPoolDb(name);
      const connection = {
        poolUtil,
        db,
      };
      this.connection = connection;
      return db.isOpen();
    } catch (error) {
      this.logger.error('Failed to install OPFS VFS:', error).print();
      return false;
    }
  }

  private getDBIns() {
    if (this.connection) {
      return this.connection.db;
    } else {
      throw new Error('No connection');
    }
  }

  async exec(sql: string) {
    this.logger.info('Executing SQL:', sql).print();
    return this.getDBIns().exec(sql, {
      rowMode: 'array',
    });
  }

  async close() {
    if (this.connection) {
      this.connection.db.close();
      await this.connection.poolUtil.removeVfs();
      this.logger.info('Closing database connection').print();
      this.connection = null;
    }
  }
}

export type DBServerClassType = typeof DBServer;

Comlink.expose(DBServer);
