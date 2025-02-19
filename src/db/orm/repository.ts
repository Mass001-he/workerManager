import { Logger } from '../../utils';
import { formatDate } from '../../utils/logger/utils';
import type { SqliteWasmORM } from '../orm';
import { removeTimezone } from '../utils';
import type { ColumnType } from './column';
import type { SQLWithBindings } from './queryBuilder/lib';
import {
  type Table,
  type ColumnInfer,
  type KernelColumnsKeys,
  kernelColumnsKeys,
} from './table';

export interface ColClause<T = any> {
  /** === */
  equal?: T | T[];
  /** !== */
  notEqual?: T | T[];
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
  orderBy?: 'ASC' | 'DESC';
}

export interface QueryClauses {
  limit?: number;
  offset?: number;
}

export type QueryOneClauses = Omit<QueryClauses, 'limit'>;

type ColumnQuery<T extends Record<string, ColumnType>> = {
  [K in keyof T]?: ColClause | T[K]['__type'] | T[K]['__type'][];
};

export class Repository<T extends Table> {
  static insMap = new Map<string, Repository<Table>>();
  static create<T extends Table>(table: T, orm: SqliteWasmORM<[T]>) {
    const key = table.name;
    if (Repository.insMap.has(key)) {
      return Repository.insMap.get(key) as Repository<T>;
    }
    const ins = new Repository(table, orm);
    //@ts-ignore
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
    private orm: SqliteWasmORM<[T]>,
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
    const columnKeyMap: any = {};
    _columns.forEach((column) => {
      Object.entries(column).forEach(([key, value]) => {
        if (!this.columns[key]) {
          this.logger.warn(
            `The column '${key}' does not exist on table '${this.table.name}'.`,
          );
          return true;
        }
        const res = this.columns[key].verify(value);

        if (res.length > 0) {
          // 报错
          throw new Error(
            `Validation failed for column ${key}: ${res.join(', ')}, current value is ${value}`,
          );
        }
        if (columnKeyMap[key] === undefined) {
          columnKeyMap[key] = true;
        }
      });
    });

    return Object.keys(columnKeyMap);
  }

  private execSQLWithBindingList(SQLWithBindingsList: SQLWithBindings[]) {
    const result: any[] = [];
    this.orm.dbOriginal.transaction(() => {
      SQLWithBindingsList.forEach(([sql, bind]) => {
        const res = this.orm.exec(sql, { bind });
        if (Array.isArray(res)) {
          result.push(...res);
        } else {
          throw new Error(`no returning`);
        }
      });
    });
    return result;
  }

  /**
   * @description 插入单条数据,内部调用`insertMany`,面对冲突会忽略
   * @description_en Insert a single item into the table, ignoring conflicts.
   * @param item
   */
  insert(item: ColumnInfer<T['columns']>) {
    this.insertMany([item]);
  }

  /**
   * @description 插入多条数据,面对冲突会忽略
   * @description_en Insert multiple items into the table, ignoring conflicts.
   * @param items
   * @returns
   */
  insertMany(items: ColumnInfer<T['columns']>[]) {
    this.validateColumns(items);
    const inserts = this.orm
      .getQueryBuilder(this.table.name)
      .insert(this.table.name)
      .values(items)
      .returning()
      .onConflict()
      .doNothing()
      .toSQL();
    const result = this.execSQLWithBindingList(inserts);
    return result;
  }

  /**
   * @description 插入单条数据,内部调用`upsertMany`,面对冲突会更新
   * @description Insert a single item into the table, updating conflicts.
   * @param item
   * @param conflictKey 可指定冲突的字段,省略冲突会导致sqlite检查所有唯一性约束，因此在某些情况下可能会有性能开销
   * @param conflictKey Specify the conflict field, omitting conflicts will cause sqlite to check all uniqueness constraints, which may have performance overhead.
   */
  upsert = (item: ColumnInfer<T['columns']>, conflictKey?: string) => {
    this.upsertMany([item], conflictKey);
  };

  /**
   * @description 插入多条数据,面对冲突会更新
   * @description_en Insert multiple items into the table, updating conflicts.
   * @param items
   * @param conflictKey 可指定冲突的字段,省略冲突会导致sqlite检查所有唯一性约束，因此在某些情况下可能会有性能开销
   * @param conflictKey Specify the conflict field, omitting conflicts will cause sqlite to check all uniqueness constraints, which may have performance overhead.
   * @returns
   */
  upsertMany(items: ColumnInfer<T['columns']>[], conflictKey?: string) {
    const columnKeys = this.validateColumns(items);
    const excluded = columnKeys.reduce((prev, curr) => {
      prev[curr] = `excluded.${curr}`;
      return prev;
    }, {} as any);

    const now = removeTimezone();
    const merge: any = { _updateAt: now };

    const inserts = this.orm
      .getQueryBuilder(this.table.name)
      .insert(this.table.name)
      .values(items)
      .returning()
      .onConflict(conflictKey as any)
      .doUpdate({
        excluded,
        merge,
      })
      .toSQL();

    const result = this.execSQLWithBindingList(inserts);
    return result;
  }

  private _query(
    conditions: ColumnQuery<T['columns']>,
    queryClauses: QueryClauses = {},
  ): ColumnInfer<T['columns']>[] {
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);
    // 构建 ORDER BY 子句
    const orderByClauses = this.buildOrderByClause(conditions);

    // 构建 LIMIT 子句
    const limitClause = this.buildLimitClause(queryClauses);

    const sql = `SELECT rowid, * FROM ${this.table.name} ${whereClauses} ${orderByClauses} ${limitClause}`;

    this.logger.info('query sql ===>', sql).print();
    const result = this.orm.exec(sql) || [];
    return result as unknown as ColumnInfer<T['columns']>[];
  }

  query(
    conditions: ColumnQuery<T['columns']>,
    queryClauses?: QueryOneClauses,
  ): ColumnInfer<T['columns']> | undefined {
    const result = this._query(conditions, {
      limit: 1,
      offset: queryClauses?.offset,
    });
    // const sqlWithBindings = this.orm.getQueryBuilder(this.table.name).select('rowid').select().from(this.table.name)

    return result[0];
  }

  queryMany(
    conditions: ColumnQuery<T['columns']>,
    queryClauses?: QueryClauses,
  ): ColumnInfer<T['columns']>[] {
    return this._query(conditions, {
      limit: queryClauses?.limit,
      offset: queryClauses?.offset,
    });
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
      fast: true,
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

  private buildUpdateSql(
    res: ColumnInfer<T['columns']>[],
    newData: ColumnInfer<T['columns']>[],
    primaryKey: string,
  ): string {
    const updateClauses = res.map((row, index) => {
      const setClauses = Object.entries(newData[index])
        .map(([key, value]) =>
          key !== primaryKey ? `${key} = ${this.escapeSqlValue(value)}` : '',
        )
        .filter(Boolean)
        .join(', ');
      return `UPDATE ${this.table.name} SET ${setClauses} WHERE ${primaryKey} = ${this.escapeSqlValue(row[primaryKey as keyof ColumnInfer<T['columns']>])};`;
    });
    return `BEGIN TRANSACTION; ${updateClauses.join(' ')} COMMIT;`;
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
    const sql = `UPDATE ${this.table.name} ${setClauses} ${whereClauses} RETURNING *;`;
    this.logger.info('update sql ===>', sql).print();
    // 执行更新操作
    return this.orm.exec(sql);
  }

  private _update(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
  ) {
    const res = this._query(conditions, {
      limit: 1,
    });
    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }

    this.validateColumns(newData);

    // 构建 SET 子句
    const setClauses = this.buildSetClauses(newData);
    // 构建更新 SQL 语句
    const sql = `UPDATE ${this.table.name} ${setClauses} WHERE rowid = ${res[0].rowid} RETURNING *;`;
    this.logger.info('update sql ===>', sql).print();
    // 执行更新操作
    return this.orm.exec(sql);
  }

  updateMany(
    conditions: ColumnQuery<T['columns']>,
    newData: Partial<ColumnInfer<T['columns']>>,
    options: {
      fast?: boolean;
    } = {
      fast: true,
    },
  ) {
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
    const sql = `UPDATE ${this.table.name} ${setClauses} ${whereClauses} RETURNING *;`;
    this.logger.info('updateMany sql ===>', sql).print();
    // 执行更新操作
    return this.orm.exec(sql);
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
    const sql = `UPDATE ${this.table.name} ${setClauses} ${whereClauses} RETURNING *;`;
    this.logger.info('updateMany sql ===>', sql).print();
    // 执行更新操作
    return this.orm.exec(sql);
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
      isHardDelete: true,
      fast: true,
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
      isHardDelete: true,
    },
  ) {
    // 构建 WHERE 子句
    const whereClauses = this.buildWhereClause(conditions);
    if (options.isHardDelete) {
      // 硬删除
      const deleteSql = `DELETE FROM ${this.table.name} ${whereClauses} RETURNING *;`;
      this.logger.info('remove sql: ', deleteSql).print();
      const _delRes = this.orm.exec(deleteSql);
      return _delRes;
    } else {
      // 软删除
      const updateSql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp ${whereClauses} RETURNING *;`;
      this.logger.info('remove sql: ', updateSql).print();
      const _delRes = this.orm.exec(updateSql);
      return _delRes;
    }
  }

  removeOne(
    conditions: ColumnQuery<T['columns']>,
    isHardDelete: boolean = false,
  ) {
    const res = this._query(conditions, {
      limit: 1,
    });

    if (res.length === 0) {
      this.logger.info('No record found').print();
      return false;
    }
    if (isHardDelete) {
      // 硬删除
      const deleteSql = `DELETE FROM ${this.table.name} WHERE rowid = ${res[0].rowid} RETURNING *;`;
      this.logger.info('remove sql: ', deleteSql).print();
      const _delRes = this.orm.exec(deleteSql);
      return _delRes;
    } else {
      // 软删除
      const updateSql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp WHERE rowid = ${res[0].rowid} RETURNING *;`;
      this.logger.info('remove sql: ', updateSql).print();
      const _delRes = this.orm.exec(updateSql);
      return _delRes;
    }
  }

  removeMany(
    conditions: ColumnQuery<T['columns']>,
    options: {
      isHardDelete?: boolean;
      fast?: boolean;
    } = {
      isHardDelete: true,
      fast: true,
    },
  ) {
    if (options.fast) {
      return this._fastRemove(conditions, {
        isHardDelete: options.isHardDelete,
      });
    }
    return this._remove(conditions, {
      isHardDelete: options.isHardDelete,
    });
  }

  private _remove(
    conditions: ColumnQuery<T['columns']>,
    options: {
      isHardDelete?: boolean;
    } = {
      isHardDelete: true,
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
      const sql = `DELETE FROM ${this.table.name} ${whereClauses} RETURNING *;`;
      this.logger.info('remove sql: ', sql).print();
      return this.orm.exec(sql);
    } else {
      const sql = `UPDATE ${this.table.name} SET _deleteAt = current_timestamp ${whereClauses} RETURNING *;`;
      this.logger.info('remove sql: ', sql).print();
      return this.orm.exec(sql);
    }
  }

  private getColumn(item: ColumnInfer<T['columns']>): string[] {
    const colNames = Object.keys(this.columns).filter(
      (key) => !key.startsWith('_') && !['rowid'].includes(key),
    );
    return Object.keys(item).filter((k) => colNames.includes(k));
  }

  private buildLimitClause(options: QueryClauses) {
    const { limit, offset } = options;
    let str = '';
    if (limit) {
      str += `LIMIT ${limit}`;
    } else {
      return str;
    }
    if (offset) {
      str += ` OFFSET ${offset}`;
    }
    return str;
  }

  private buildOrderByClause(conditions: ColumnQuery<T['columns']>) {
    const orderByOptions = Object.entries(conditions).filter(([_, v]) => {
      // 如果v是对象，并且有order属性，那么就认为是排序条件
      if (typeof v === 'object' && v !== null && 'orderBy' in v) {
        return true;
      }
    });

    if (orderByOptions.length === 0) {
      return '';
    }
    const orderByStr = orderByOptions
      .map(([k, v]) => {
        return `${k} ${v.orderBy}`;
      })
      .filter(Boolean)
      .join(', ');
    return `ORDER BY ${orderByStr}`;
  }

  /**
   * 构建 WHERE 子句
   * @param conditions
   * @returns
   */
  private buildWhereClause(conditions: ColumnQuery<T['columns']>) {
    const whereClauses = Object.entries(conditions)
      ?.map(([key, options]) => {
        return this.optionsClauses(key, options);
      })
      .filter(Boolean)
      .join(' AND ');
    this.logger.info(`whereClauses: ${whereClauses}`);
    if (!whereClauses) {
      return `WHERE _deleteAt IS NULL`;
    }
    return `WHERE _deleteAt IS NULL AND ${whereClauses}`;
  }

  private buildWhereWithRowid(res: ColumnInfer<T['columns']>[]) {
    return `WHERE rowid IN (${res.map((item) => item.rowid)})`;
  }

  private handleArrayClause(options: string[] | number[]) {
    if (options.length === 0) {
      return '()';
    }
    return `(${options.map((item) => (typeof item === 'string' ? `'${item.replace(/'/g, "''")}'` : item)).join(', ')})`;
  }

  private optionsClauses(
    attr: string,
    options:
      | ColClause
      | string
      | number
      | string[]
      | number[]
      | null
      | undefined,
  ) {
    if (options === null || options === undefined) {
      return `${attr} IS NULL`;
    }

    if (typeof options === 'string' || typeof options === 'number') {
      return `${attr} = ${typeof options === 'string' ? `'${options.replace(/'/g, "''")}'` : options}`;
    }
    if (Array.isArray(options)) {
      let str = '';
      // 判断options数组中是否包含null或undefined
      if (options.some((item) => item === null || item === undefined)) {
        str = `${attr} IS NULL`;
      }

      // 排除options数组中的null和undefined
      const newOptions = options.filter(
        (item) => item !== null && item !== undefined,
      ) as string[] | number[];

      return str
        ? `${str} OR ${attr} IN ${this.handleArrayClause(newOptions)}`
        : `${attr} IN ${this.handleArrayClause(newOptions)}`;
    }
    const clauses: string[] = [];
    const orClauses: string[] = [];

    if (
      options.hasOwnProperty('equal') &&
      (options.equal === null || options.equal === undefined)
    ) {
      clauses.push(`${attr} IS NULL`);
    }

    if (
      options.hasOwnProperty('notEqual') &&
      (options.notEqual === null || options.notEqual === undefined)
    ) {
      clauses.push(`${attr} IS NOT NULL`);
    }

    if (options.equal !== undefined && options.equal !== null) {
      if (Array.isArray(options.equal)) {
        // 判断options.equal数组中是否包含null或undefined
        if (options.equal.some((item) => item === null || item === undefined)) {
          orClauses.push(`${attr} IS NULL`);
        }
        // 排除options.equal数组中的null和undefined
        const newOptions = options.equal.filter(
          (item) => item !== null && item !== undefined,
        ) as string[] | number[];
        // if (newOptions.length !== 0) {
        clauses.push(`${attr} IN ${this.handleArrayClause(newOptions)}`);
        // }
      } else {
        clauses.push(
          `${attr} = ${typeof options.equal === 'string' ? `'${options.equal.replace(/'/g, "''")}'` : options.equal}`,
        );
      }
    }
    if (options.notEqual !== undefined && options.notEqual !== null) {
      if (Array.isArray(options.notEqual)) {
        // 判断options.notEqual数组中是否包含null或undefined
        if (
          options.notEqual.some((item) => item === null || item === undefined)
        ) {
          orClauses.push(`${attr} IS NOT NULL`);
        }
        // 排除options.notEqual数组中的null和undefined
        const newOptions = options.notEqual.filter(
          (item) => item !== null && item !== undefined,
        ) as string[] | number[];
        // if (newOptions.length !== 0) {
        clauses.push(`${attr} NOT IN ${this.handleArrayClause(newOptions)}`);
        // }
      } else {
        clauses.push(
          `${attr} != ${typeof options.notEqual === 'string' ? `'${options.notEqual.replace(/'/g, "''")}'` : options.notEqual}`,
        );
      }
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

    // 拼接当前 attr 的所有 and 条件
    const currentAttrClauses = clauses.join(' AND ');
    // 拼接当前 attr 的所有 or 条件
    const currentAttrOrClauses = orClauses.join(' OR ');
    // 如果当前 attr 的所有条件和所有 or 条件都为空，则返回空字符串
    if (!currentAttrClauses && !currentAttrOrClauses) {
      return '';
    }
    // 如果当前 attr 的所有条件和所有 or 条件都不为空，则返回当前 attr 的所有条件和所有 or 条件的拼接结果
    if (currentAttrClauses && currentAttrOrClauses) {
      return `(${currentAttrClauses} OR ${currentAttrOrClauses})`;
    }
    // 如果当前 attr 的所有条件不为空，则返回当前 attr 的所有条件
    if (currentAttrClauses) {
      return `${currentAttrClauses}`;
    }
    // 如果当前 attr 的所有 or 条件不为空，则返回当前 attr 的所有 or 条件
    if (currentAttrOrClauses) {
      return `${currentAttrOrClauses}`;
    }
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
          return `${key} = '${(value as string).replace(/'/g, "''")}'`; // 处理字符串中的单引号
        }
        if (value === null || value === undefined) {
          return `${key} = NULL`;
        }
        return `${key} = ${value}`;
      })
      .join(', ');

    if (setClauses === '') {
      return '';
    }

    return `SET ${setClauses}`;
  }

  private escapeSqlValue(value: any): string {
    if (typeof value === 'string') {
      // 处理字符串中的单引号
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }
}
