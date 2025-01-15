import { Logger } from '../../utils';
import type { DBServer } from '../dbServer';
import type { ColumnType } from './column';
import type { Table, ColumnInfer } from './table';

export interface QueryOptions<T = any> {
  /** === */
  equal?: T;
  /** < */
  lt?: number;
  /** > */
  gt?: number;
  /** <= */
  lte?: number;
  /** >= */
  gte?: number;
  /** like */
  like?: string;
}

type ColumnQuery<T extends Record<string, ColumnType>> = {
  [K in keyof T]?: QueryOptions | T[K]['__type'];
};

export class Repository<T extends Table> {
  static insMap = new Map<string, Repository<Table>>();
  static create<T extends Table>(table: T, server: DBServer<[T]>) {
    const key = table.name;
    if (Repository.insMap.has(key)) {
      return Repository.insMap.get(key) as Repository<T>;
    }
    const ins = new Repository(table, server);
    Repository.insMap.set(key, ins);
    return ins;
  }
  private logger: Logger;

  get name() {
    return this.table.name;
  }

  get columns() {
    return this.table.columns as Record<string, ColumnType>;
  }

  private constructor(
    private table: T,
    private server: DBServer<[T]>,
  ) {
    this.logger = Logger.scope(`Repo_${table.name}`);
    this.logger.info('created').print();
  }

  private validateColumns(
    columns: ColumnInfer<T['columns']> | ColumnInfer<T['columns']>[],
  ) {
    const _columns = Array.isArray(columns) ? [...columns] : [columns];

    _columns.forEach((column) => {
      Object.entries(column).forEach(([key, value]) => {
        const res = this.table.columns[key].verify(value);

        if (res.length > 0) {
          // 报错
          throw new Error(
            `Validation failed for column ${key}: ${res.join(', ')}, current value is ${value}`,
          );
        }
      });
    });
  }

  insert(item: ColumnInfer<T['columns']>) {
    return this.insertMany([item]);
  }

  insertMany(items: ColumnInfer<T['columns']>[]) {
    this.validateColumns(items);

    const columns = Object.keys(items[0]).join(', ');

    // 构建插入 SQL 语句
    const valuesList = items
      .map((item) => {
        const values = Object.values(item).map((value) => {
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`; // 处理字符串中的单引号
          }
          return value;
        });
        return `(${values.join(', ')})`;
      })
      .join(', ');

    const sql = `INSERT INTO ${this.table.name} (${columns}) VALUES ${valuesList};`;
    // 执行插入操作
    return this.server.exec(sql);
  }

  query(
    conditions: ColumnQuery<T['columns']>,
  ): ColumnInfer<T['columns']> | undefined {
    const result = this._query(conditions, 1);
    return result[0];
  }

  queryMany(
    conditions: ColumnQuery<T['columns']>,
  ): ColumnInfer<T['columns']>[] {
    return this._query(conditions);
  }

  private _query(
    conditions: ColumnQuery<T['columns']>,
    limit?: number,
  ): ColumnInfer<T['columns']>[] {
    const whereClauses = Object.entries(conditions)
      .map(([attr, options]) => {
        if (typeof options === 'string' || typeof options === 'number') {
          return `${attr} = ${typeof options === 'string' ? `'${options.replace(/'/g, "''")}'` : options}`;
        }

        const clauses: string[] = [];

        if (options.equal !== undefined) {
          clauses.push(
            `${attr} = ${typeof options.equal === 'string' ? `'${options.equal.replace(/'/g, "''")}'` : options.equal}`,
          );
        }
        if (options.lt !== undefined) {
          clauses.push(`${attr} < ${options.lt}`);
        }
        if (options.gt !== undefined) {
          clauses.push(`${attr} > ${options.gt}`);
        }
        if (options.lte !== undefined) {
          clauses.push(`${attr} <= ${options.lte}`);
        }
        if (options.gte !== undefined) {
          clauses.push(`${attr} >= ${options.gte}`);
        }
        if (options.like !== undefined) {
          clauses.push(`${attr} LIKE '%${options.like.replace(/'/g, "''")}%'`);
        }

        return clauses.join(' AND ');
      })
      .join(' AND ');

    const sqlBase = `SELECT * FROM ${this.table.name} WHERE ${whereClauses}`;
    const sql = limit ? sqlBase + ` LIMIT ${limit};` : `;`;
    const result = this.server.exec(sql) || [];
    return result as unknown as ColumnInfer<T['columns']>[];
  }

  update() {}

  updateMany() {}

  remove(conditions: ColumnQuery<T['columns']>) {
    const res = this._query(conditions, 1);

    if (res.length === 0) {
      return false;
    }

    const deleteSql = `DELETE FROM ${this.table.name} WHERE _id = ${res[0]._id}`;
    const _delRes = this.server.exec(deleteSql);
    return _delRes;
  }

  removeMany(conditions: ColumnQuery<T['columns']>) {
    return this._remove(conditions);
  }

  private _remove(conditions: ColumnQuery<T['columns']>) {
    const whereClauses = Object.entries(conditions)
      .map(([key, options]) => {
        if (typeof options === 'string' || typeof options === 'number') {
          return `${key} = ${typeof options === 'string' ? `'${options.replace(/'/g, "''")}'` : options}`;
        }
        const clauses: string[] = [];

        if (options.equal !== undefined) {
          clauses.push(
            `${key} = ${typeof options.equal === 'string' ? `'${options.equal.replace(/'/g, "''")}'` : options.equal}`,
          );
        }
        if (options.lt !== undefined) {
          clauses.push(`${key} < ${options.lt}`);
        }
        if (options.gt !== undefined) {
          clauses.push(`${key} > ${options.gt}`);
        }
        if (options.lte !== undefined) {
          clauses.push(`${key} <= ${options.lte}`);
        }
        if (options.gte !== undefined) {
          clauses.push(`${key} >= ${options.gte}`);
        }
        if (options.like !== undefined) {
          clauses.push(`${key} LIKE '%${options.like.replace(/'/g, "''")}%'`);
        }

        return clauses.join(' AND ');
      })
      .join(' AND ');

    const sql = `DELETE FROM ${this.table.name} WHERE ${whereClauses}`;
    return this.server.exec(sql);
  }
}
