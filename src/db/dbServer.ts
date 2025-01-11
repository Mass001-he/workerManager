import * as Comlink from 'comlink';
import initSqlite3, { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
import { Logger } from '../utils';

export interface DBConnectOptions {
  directory?: string;
}

class DBServer {
  private connection: OpfsSAHPoolDatabase | null = null;
  private logger: Logger = Logger.scope('DBServer');

  async connect(name: string, options: DBConnectOptions) {
    this.logger.info('Connecting to database:', name, options).print();
    const sqlite3 = await initSqlite3();
    const { directory } = options;

    try {
      // pollUtil 为可用于执行文件池的基本管理的实用程序对象
      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
        directory,
      });
      const { OpfsSAHPoolDb } = poolUtil;
      this.connection = new OpfsSAHPoolDb(name);
      return true;
    } catch (error) {
      this.logger.error('Failed to install OPFS VFS:', error).print();
      return false;
    }
  }

  private getConnection() {
    if (this.connection) {
      return this.connection;
    } else {
      throw new Error('No connection');
    }
  }

  async exec(sql: string) {
    this.logger.info('Executing SQL:', sql).print();
    this.getConnection().exec(sql);
  }

  async close() {
    this.logger.info('Closing database connection').print();
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}

export type DBServerClassType = typeof DBServer;

Comlink.expose(DBServer);
