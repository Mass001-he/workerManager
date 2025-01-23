import type {
  ExecBaseOptions,
  ExecReturnThisOptions,
  ExecRowModeObjectOptions,
  OpfsSAHPoolDatabase,
  SAHPoolUtil,
} from '@sqlite.org/sqlite-wasm';
import type { Table } from './table';
import { Logger } from '../../utils';
import { Repository } from './repository';
import { Upgrade } from './upgrade';
import initSqlite3 from '@sqlite.org/sqlite-wasm';

export interface SqliteWasmORMOptions<T extends Table[]> {
  tables: T;
  version: number;
}
function isPositiveInt(num: number) {
  const isDecimal = num % 1 !== 0;
  if (isDecimal) {
    return false;
  }
  return num > 0;
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
  public upgrade: Upgrade<T>;

  constructor(options: SqliteWasmORMOptions<T>) {
    if (isPositiveInt(options.version) === false) {
      throw new Error('version must be an integer greater than 0');
    }
    this.version = options.version;
    this.tables = options.tables;
    this.upgrade = new Upgrade(this);
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
        const upgradeRes = this.upgrade.init();
        if (upgradeRes === false) {
          throw new Error('Database upgrade failed');
        }
        return true;
      }
      return false;
    } catch (error) {
      if (this.connection?.db) {
        this.connection.db.close();
      }
      this.logger.error('Failed to install OPFS VFS:', error).print();
      return false;
    }
  }

  findTable<N extends T[number]['name']>(
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

  exec<R>(
    sql: string,
    options?: ExecBaseOptions &
      ExecRowModeObjectOptions &
      ExecReturnThisOptions,
  ) {
    try {
      const result = this.dbOriginal.exec(sql, {
        rowMode: 'object',
        ...options,
      });
      this.logger
        .info('Exec:\n', {
          sql,
          result,
        })
        .print();
      return result as R;
    } catch (error) {
      this.logger.error(`Exec :${sql}`, error).print();
      throw error;
    }
  }

  callRepo<N extends T[number]['name']>(name: N) {
    return this.getRepository(name);
  }
}
