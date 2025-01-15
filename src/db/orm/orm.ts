import type { OpfsSAHPoolDatabase, SAHPoolUtil } from "@sqlite.org/sqlite-wasm";
import type { Table } from "./table";
import  { Logger } from "../../utils";
import initSqlite3 from "@sqlite.org/sqlite-wasm";
import { Repository } from "./repository";

export class SqliteWasmORM<T extends Table[]> {
  public connection: {
    poolUtil: SAHPoolUtil;
    db: OpfsSAHPoolDatabase; 
  } | null = null;
  private logger: Logger = Logger.scope('DBServer');
  public tables: T;

  constructor(tables: T) {
    this.tables = tables;
  }

  private checkMetadata() {
    //查询是否存在metadata表
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';`;
    const result = this.exec<any[]>(sql);
    const hasMetadata = result.length > 0;
    if (!hasMetadata) {
      this.logger.info('Creating metadata table').print();
      this.exec(
        `CREATE TABLE metadata (key TEXT NOT NULL,value TEXT NOT NULL);`,
      );
    }
  }

  private migration() {
    this.checkMetadata();
    this.logger.info('Migration start').print();
    this.logger.info('Loading models:', this.tables).print();
    const sql = this.tables
      .map((table) => {
        return table.genCreateSql();
      })
      .join('\n');
    return this.exec(sql);
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
      };
      this.connection = connection;
      const isOpen = db.isOpen();
      if (isOpen) {
        this.logger.info('Database connection established').print();
        this.migration();
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

  private getDBIns() {
    if (this.connection) {
      return this.connection.db;
    } else {
      throw new Error('No connection');
    }
  }

  exec<R>(sql: string) {
    const result = this.getDBIns().exec(sql, {
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