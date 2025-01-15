import * as Comlink from 'comlink';
import initSqlite3, {
  OpfsSAHPoolDatabase,
  type SAHPoolUtil,
} from '@sqlite.org/sqlite-wasm';
import { Logger } from '../utils';
import { ORM, table, type Table } from './orm';
import { integer, text } from './orm/column';
import { Repository } from './orm/repository';

export class DBServer<T extends Table[]> {
  public connection: {
    poolUtil: SAHPoolUtil;
    db: OpfsSAHPoolDatabase;
  } | null = null;
  private orm: ORM<T>;
  private logger: Logger = Logger.scope('DBServer');
  public tables: T;

  constructor(tables: T) {
    this.tables = tables;
    this.orm = new ORM<T>(this);
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
        this.orm.migration();
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

  exec(sql: string) {
    const result = this.getDBIns().exec(sql, {
      rowMode: 'object',
    });
    this.logger
      .info('Exec:\n', {
        sql,
        result,
      })
      .print();
    return result;
  }
}

const userTable = table('user', {
  name: text().optional(),
  age: integer().max(100),
});

const postTable = table(
  'post',
  {
    title: text(),
    content: text(),
  },
  () => {
    return {
      unique: ['title'],
    };
  },
);

const dbServer = new DBServer([userTable, postTable]);
const userRepo = dbServer.getRepository('user');
//test
setTimeout(() => {
  // const users = [];
  // for (let i = 0; i < 101; i++) {
  //   users.push({
  //     name: `name${i}`,
  //     age: i,
  //   });
  // }
  // userRepo.insertMany(users);
  userRepo.remove({
    name: {
      equal: 'name0',
    },
  });
}, 1000);

Comlink.expose(dbServer);
