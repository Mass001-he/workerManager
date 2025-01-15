import type { OpfsSAHPoolDatabase, SAHPoolUtil } from '@sqlite.org/sqlite-wasm';
import type { Table } from './table';
import { Logger } from '../../utils';
import { Repository } from './repository';
import { Migration } from './migration';
import initSqlite3 from '@sqlite.org/sqlite-wasm';

export interface SqliteWasmORMOptions<T extends Table[]> {
  tables: T;
  version: number;
}

export class SqliteWasmORM<T extends Table[]> {
  public connection: {
    name: string;
    poolUtil: SAHPoolUtil;
    db: OpfsSAHPoolDatabase;
  } | null = null;
  private logger: Logger = Logger.scope('ORM');
  public version: number;
  public tables: T;
  public migration: Migration<T>;

  constructor(options: SqliteWasmORMOptions<T>) {
    this.version = options.version;
    this.tables = options.tables;
    this.migration = new Migration(this);
  }

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
        name,
      };
      this.connection = connection;
      const isOpen = db.isOpen();
      if (isOpen) {
        this.logger.info('Database connection established').print();
        this.migration.init();
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to install OPFS VFS:', error).print();
      return false;
    }
  }

  private findTable<N extends T[number]['name']>(
    name: N,
  ): Extract<T[number], { name: N }> {
    const table = this.tables.find((table) => table.name === name) as Extract<
      T[number],
      { name: N }
    >;
    if (!table) {
      throw new Error(`Table ${name} not found`);
    }
    return table;
  }

  getRepository<N extends T[number]['name']>(name: N) {
    const table = this.findTable(name);
    return Repository.create(table, this as any);
  }

  /**
   * 获取原始数据库对象
   */
  get dbOriginal() {
    if (this.connection) {
      return this.connection.db;
    } else {
      throw new Error('No connection');
    }
  }

  exec<R>(sql: string) {
    const result = this.dbOriginal.exec(sql, {
      rowMode: 'object',
    });
    this.logger
      .info('Exec:\n', {
        sql,
        result,
      })
      .print();
    return result as R;
  }
}
