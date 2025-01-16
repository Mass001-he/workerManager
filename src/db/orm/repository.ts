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

  private validateKernelCols(data: Partial<ColumnInfer<T['columns']>>) {
    const keys = Object.keys(data);
    for (const key of keys) {
      if (kernelColumnsKeys.includes(key as KernelColumnsKeys)) {
        throw new Error(`Cannot change kernel columns ${key}`);
      }
    }
  }

  private validateColumns(
    columns:
      | Partial<ColumnInfer<T['columns']>>
      | Partial<ColumnInfer<T['columns']>>[],
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

  private _query(
    conditions: ColumnQuery<T['columns']>,
    limit?: number,
  ): ColumnInfer<T['columns']>[] {
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);

    const sqlBase = `SELECT rowid, * FROM ${this.table.name} WHERE ${whereClauses} AND _deleteAt IS NULL`;
    const sql = limit ? sqlBase + ` LIMIT ${limit};` : sqlBase + `;`;
    const result = this.server.exec(sql) || [];
    return result as unknown as ColumnInfer<T['columns']>[];
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

  /**
   * 更新单条数据
   * @param conditions 筛选数据条件
   * @param newData 新数据
   * @returns
   */
  update(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
    options: {
      fast?: boolean;
    } = {
      fast: false,
    },
  ) {
    const { fast } = options;
    this.validateKernelCols(newData);

    if (fast) {
      // 快速更新，不查询直接操作数据库
      return this._fastUpdate(conditions, newData);
    } else {
      // 先查询数据库，再更新
      return this._update(conditions, newData);
    }
  }

  private _fastUpdate(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
  ) {
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);
    // 验证新数据
    this.validateColumns(newData);
    // 构建 SET 子句
    const setClauses = this.buildSetClauses(newData);
    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} SET ${setClauses} WHERE ${whereClauses}`;
    // 执行更新操作
    this.server.exec(sql);
    return true;
  }

  private _update(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
  ) {
    const res = this._query(conditions, 1);
    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }

    this.validateColumns(newData);

    // 构建 SET 子句
    const setClauses = this.buildSetClauses(newData);
    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} SET ${setClauses} WHERE rowid = ${res[0].rowid}`;
    // 执行更新操作
    this.server.exec(sql);

    return true;
  }

  updateMany(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
    options: {
      fast?: boolean;
    } = {
      fast: false,
    },
  ): boolean {
    const { fast } = options;
    if (fast) {
      // 快速更新，不查询直接操作数据库
      return this._fastUpdateMany(conditions, newData);
    } else {
      // 先查询数据库，再更新
      return this._updateMany(conditions, newData);
    }
  }

  private _fastUpdateMany(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
  ) {
    this.validateKernelCols(newData);
    // 验证新数据
    this.validateColumns(newData);
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);
    // 构建 SET 子句
    const setClauses = this.buildSetClauses(newData);
    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} SET ${setClauses} WHERE ${whereClauses}`;
    // 执行更新操作
    this.server.exec(sql);
    return true;
  }

  private _updateMany(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
  ) {
    this.validateKernelCols(newData);
    // 验证新数据
    this.validateColumns(newData);
    // 查询满足条件的数据
    const res = this._query(conditions);
    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }
    // 构建 SET 子句
    const setClauses = this.buildSetClauses(newData);
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereWithRowid(res);
    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} SET ${setClauses} WHERE ${whereClauses}`;
    // 执行更新操作
    this.server.exec(sql);

    return true;
  }

  /**
   * 删除数据
   * @param conditions 筛选数据条件
   * @param options 删除选项
   * @returns
   */
  remove(
    conditions: ColumnQuery<T['columns']>,
    options: {
      isHardDelete?: boolean;
      fast?: boolean;
    } = {
      isHardDelete: false,
      fast: false,
    },
  ) {
    const { isHardDelete, fast } = options;
    if (fast) {
      // 快速删除， 不查询直接操作数据库
      return this._fastRemove(conditions, {
        isHardDelete,
      });
    } else {
      // 先查询数据库，再删除
      return this._remove(conditions, {
        isHardDelete,
      });
    }
  }

  /**
   * 快速删除，不返回结果,直接删除数据库中的数据
   * @param conditions
   * @param options
   * @returns
   */
  private _fastRemove(
    conditions: ColumnQuery<T['columns']>,
    options: {
      isHardDelete?: boolean;
    } = {
      isHardDelete: false,
    },
  ) {
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);
    if (options.isHardDelete) {
      // 硬删除
      const deleteSql = `DELETE FROM ${this.table.name} WHERE ${whereClauses}`;
      const _delRes = this.server.exec(deleteSql);
      return _delRes;
    } else {
      // 软删除
      const updateSql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp WHERE ${whereClauses}`;
      const _delRes = this.server.exec(updateSql);
      return _delRes;
    }
  }

  removeOne(
    conditions: ColumnQuery<T['columns']>,
    isHardDelete: boolean = false,
  ) {
    const res = this._query(conditions, 1);

    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }
    if (isHardDelete) {
      // 硬删除
      const deleteSql = `DELETE FROM ${this.table.name} WHERE rowid = ${res[0].rowid}`;
      const _delRes = this.server.exec(deleteSql);
      return _delRes;
    } else {
      // 软删除
      const updateSql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp WHERE rowid = ${res[0].rowid}`;
      const _delRes = this.server.exec(updateSql);
      return _delRes;
    }
  }

  removeMany(
    conditions: ColumnQuery<T['columns']>,
    isHardDelete: boolean = false,
  ) {
    return this._remove(conditions, {
      isHardDelete,
    });
  }

  private _remove(
    conditions: ColumnQuery<T['columns']>,
    options: {
      isHardDelete?: boolean;
    } = {
      isHardDelete: false,
    },
  ) {
    // 查询数据库中满足条件的数据
    const res = this._query(conditions);
    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }

    // 构建 WHERE 子句
    const whereClauses = this.buildWhereWithRowid(res);

    if (options.isHardDelete) {
      const sql = `DELETE FROM ${this.table.name} WHERE ${whereClauses}`;
      return this.server.exec(sql);
    } else {
      const sql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp WHERE ${whereClauses}`;
      return this.server.exec(sql);
    }
  }

  private getColumn(item: ColumnInfer<T['columns']>): string {
    return Object.keys(item).join(', ');
  }

  /**
   * 构建 WHERE 子句
   * @param conditions
   * @returns
   */
  private buildWhereClause(conditions: ColumnQuery<T['columns']>) {
    const whereClauses = Object.entries(conditions)
      .map(([key, options]) => {
        return this.optionsClauses(key, options);
      })
      .join(' AND ');
    return whereClauses;
  }

  private buildWhereWithRowid(res: ColumnInfer<T['columns']>[]) {
    return `rowid IN (${res.map((item) => item.rowid)})`;
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

  /**
   * 构建 SET 子句
   * @param newData
   * @returns
   */
  private buildSetClauses(newData: Partial<ColumnInfer<T['columns']>>): string {
    const setClauses = Object.entries(newData)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${value.replace(/'/g, "''")}'`; // 处理字符串中的单引号
        }
        return `${key} = ${value}`;
      })
      .join(', ');

    return setClauses;
  }
}
