import { Logger } from '../../utils';
import type { SqliteWasmORM } from '../orm';
import type { ColumnType } from './column';
import {
  type Table,
  type ColumnInfer,
  type KernelColumnsKeys,
  kernelColumnsKeys,
} from './table';

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
  static create<T extends Table>(table: T, server: SqliteWasmORM<[T]>) {
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
    private server: SqliteWasmORM<[T]>,
  ) {
    this.logger = Logger.scope(`Repo_${table.name}`);
    this.logger.info('created').print();
  }

  private validateKernelCols(data: ColumnInfer<T['columns']>) {
    const keys = Object.keys(data);
    for (const key of keys) {
      if (kernelColumnsKeys.includes(key as KernelColumnsKeys)) {
        throw new Error(`Cannot change kernel columns ${key}`);
      }
    }
  }

  private validateColumns(
    columns: ColumnInfer<T['columns']> | ColumnInfer<T['columns']>[],
  ) {
    const _columns = Array.isArray(columns) ? [...columns] : [columns];

    _columns.forEach((column) => {
      Object.entries(column).forEach(([key, value]) => {
        const res = this.columns[key].verify(value);

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

    const columns = this.getColumn(items[0]);

    // 构建插入 SQL 语句
    const valuesList = items
      .map((item) => {
        const values = Object.values(item).map((value) => {
          if (typeof value === 'string') {
            return `'${(value as string).replace(/'/g, "''")}'`; // 处理字符串中的单引号
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
        return this.optionsClauses(attr, options);
      })
      .join(' AND ');

    const sqlBase = `SELECT rowid, * FROM ${this.table.name} WHERE ${whereClauses}`;
    const sql = limit ? sqlBase + ` LIMIT ${limit};` : `;`;
    const result = this.server.exec(sql) || [];
    return result as unknown as ColumnInfer<T['columns']>[];
  }

  update() {}

  updateMany(
    conditions: ColumnQuery<T['columns']>,
    newData: Omit<Partial<ColumnInfer<T['columns']>>, KernelColumnsKeys>,
  ): boolean {
    // 验证新数据
    this.validateColumns(newData);

    // 构建 WHERE 子句
    const whereClauses = Object.entries(conditions)
      .map(([key, options]) => {
        return this.optionsClauses(key, options);
      })
      .join(' AND ');

    // 构建 SET 子句
    const setClauses = Object.entries(newData)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${value.replace(/'/g, "''")}'`; // 处理字符串中的单引号
        }
        return `${key} = ${value}`;
      })
      .join(', ');

    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} SET ${setClauses} WHERE ${whereClauses}`;

    // 执行更新操作
    this.server.exec(sql);

    return true;
  }

  remove(conditions: ColumnQuery<T['columns']>) {
    const res = this._query(conditions, 1);

    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }
    const deleteSql = `DELETE FROM ${this.table.name} WHERE rowid = ${res[0].rowid}`;
    const _delRes = this.server.exec(deleteSql);
    return _delRes;
  }

  removeMany(conditions: ColumnQuery<T['columns']>) {
    return this._remove(conditions);
  }

  private _remove(conditions: ColumnQuery<T['columns']>) {
    const whereClauses = Object.entries(conditions)
      .map(([key, options]) => {
        return this.optionsClauses(key, options);
      })
      .join(' AND ');

    const sql = `DELETE FROM ${this.table.name} WHERE ${whereClauses}`;
    return this.server.exec(sql);
  }

  private getColumn(item: ColumnInfer<T['columns']>): string {
    return Object.keys(item).join(', ');
  }

  private optionsClauses(
    attr: string,
    options: QueryOptions | string | number,
  ) {
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
  }
}
