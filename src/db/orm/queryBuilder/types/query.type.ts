export type Keyof<T> = keyof T & string
export type Bindings = (string | number)[]
export type SQLWithBindings = [string, Bindings]
export interface SQLBuilder {
  select: (clauses?: SelectClause[]) => SQLWithBindings
  from: (clauses?: FromClause[]) => SQLWithBindings
  where: (clauses?: WhereClause[]) => SQLWithBindings
  groupBy: (clauses?: GroupByClause[]) => SQLWithBindings
  orderBy: (clauses?: OrderByClause[]) => SQLWithBindings
  returning: (clauses?: ReturningClause[]) => SQLWithBindings
  insert: (clauses: InsertClause[]) => SQLWithBindings[]
  offset: (value?: number) => SQLWithBindings
  limit: (value?: number) => SQLWithBindings
  update: (clauses: UpdateClause[]) => SQLWithBindings
}
export type SelectColumn<T> = Keyof<T> | '*' | 'rowid'
export type Column<T> = Keyof<T> | 'rowid'
export type NoRowIdColumn<T> = Keyof<T>

export interface QueryDescription<T> {
  selectClauses: SelectClause<T>[]
  fromClauses: FromClause[]
  whereClauses: WhereClause<T>[]
  orderByClauses: OrderByClause<T>[]
  groupByClauses: GroupByClause<T>[]
  offsetValue?: number
  limitValue?: number
  insertClauses: InsertClause<T>[]
}

export interface WhereConditionDescription {
  /** equal */
  $eq?: any
  /** not equal */
  $neq?: any
  /** greater than */
  $gt?: any
  /** greater than or equal to */
  $gte?: any
  /** less than */
  $lt?: any
  /** less than or equal to */
  $lte?: any
  /** like */
  $like?: any
  /** not like */
  $in?: any[]
  /** not in */
  $nin?: any[]
  /** null or not null */
  $null?: boolean
  /** between */
  $between?: [any, any]
  /** not between */
  $notBetween?: [any, any]
}

export type WhereCondition<T> = {
  [P in keyof T]?:
    | {
        /** equal */
        $eq?: T[P]
        /** not equal */
        $neq?: T[P]
        /** greater than */
        $gt?: T[P]
        /** greater than or equal to */
        $gte?: T[P]
        /** less than */
        $lt?: T[P]
        /** less than or equal to */
        $lte?: T[P]
        /** like */
        $like?: T[P]
        /** not like */
        $in?: T[P][]
        /** not in */
        $nin?: T[P][]
        /** null or not null */
        $null?: boolean
        /** between */
        $between?: [T[P], T[P]]
        /** not between */
        $notBetween?: [T[P], T[P]]
      }
    | T[P]
}

export type WhereType = 'AND' | 'OR'
export type OrderByType = 'ASC' | 'DESC'

export interface Raw {
  sql: string
  bindings?: Bindings
}
//#region Classes and Interfaces
export interface SelectClause<T = any> {
  rule: Keyof<T> | string
}

export interface FromClause {
  rule?: string
  raw?: Raw
}

export interface WhereRaw extends Raw {
  type: WhereType
}

export interface WhereClause<T = any> {
  rule?: {
    type: WhereType
    conditions: WhereCondition<T>
  }
  raw?: WhereRaw
}

export interface OrderByClause<T = any> {
  rule?: {
    column: keyof T
    direction?: OrderByType
  }
  raw?: Raw
}

export interface GroupByClause<T = any> {
  rule?: {
    column: keyof T
  }
  raw?: Raw
}

export interface UpdateClause<T = any> {
  rule?: {
    table: string
    values: Partial<T>
  }
  raw?: Raw
}

export interface InsertClause<T = any> {
  rule?: {
    table: string
    values: Partial<T> | Partial<T>[]
  }
  raw?: Raw
}
export interface GroupByClause<T = any> {
  rule?: {
    column: keyof T
  }
  raw?: Raw
}

export interface ReturningClause<T = any> {
  rule?: SelectColumn<T>
  raw?: Raw
}

export interface DeleteClause {
  rule?: {
    table: string
  }
  raw?: Raw
}

//#endregion

export interface IWhereImpl<T> {
  /**
   * Specify the conditions for the 'WHERE' clause.
   * @param conditions The conditions to filter the query results.
   * @example
   * const query = queryBuilder.select('*').from('table').where({ column1: 'value' });
   */
  where(conditions: WhereCondition<T>): this
  /**
   * Specify the conditions for the 'OR WHERE' clause.
   * @param conditions The conditions to filter the query results.
   * @example
   * const query = queryBuilder.select('*').from('table').where({ column1: 'value' }).orWhere({ column2: 'value' });
   */
  orWhere(conditions: WhereCondition<T>): this
  /**
   * Specify the conditions for the 'WHERE' clause using a raw SQL query.
   * @param sql The SQL query to execute
   * @param bindings The binding parameters for the SQL query.
   * @example
   * const query = queryBuilder.select('*').from('table').whereRaw('column1 = ?', ['value']);
   */
  whereRaw(sql: string, bindings?: Bindings): this
  /**
   * Specify the conditions for the 'OR WHERE' clause using a raw SQL query.
   * @param sql The SQL query to execute
   * @param bindings The binding parameters for the SQL query.
   * @example
   * const query = queryBuilder.select('*').from('table').whereRaw('column1 = ?', ['value']).orWhereRaw('column2 = ?', ['value']);
   */
  orWhereRaw(sql: string, bindings?: Bindings): this
}

export interface IReturningImpl<T> {
  returning(col?: SelectColumn<T> | SelectColumn<T>[]): this
  returningRaw(sql: string, bindings?: Bindings): this
}

export interface IOrderByImpl<T> {
  /**
   * Specify the order of the results.
   * @param column The column to order by.
   * @param direction The direction to order by.
   * - 'ASC' for ascending order.
   * - 'DESC' for descending order.
   * @example
   * const query = queryBuilder.select('*').from('table').orderBy('column1', 'ASC');
   */
  orderBy(column: Column<T>, direction?: OrderByType): this
  /**
   * Specify the order of the results using a raw SQL query.
   * @param sql The SQL query to execute.
   * @example
   * const query = queryBuilder.select('*').from('table').orderByRaw('column1 ASC');
   */
  orderByRaw(sql: string, bindings?: Bindings): this
}

export interface IGroupByImpl<T> {
  /**
   * Specify the grouping of the results.
   * @param column The column to group by.
   * @example
   * const query = queryBuilder.select('*').from('table').groupBy('column1');
   */
  groupBy(column: Column<T>): this
  /**
   * Specify the grouping of the results using a raw SQL query.
   * @param sql The SQL query to execute.
   * @example
   * const query = queryBuilder.select('*').from('table').groupByRaw('column1');
   */
  groupByRaw(sql: string, bindings?: Bindings): this
}

export interface ILimitImpl {
  /**
   * Specify the number of records.
   * @param limit The number of records
   * @example
   * const query = queryBuilder.select('*').from('table').limit(10);
   */
  limit(limit: number): this
}

export interface IFromImpl {
  /**
   * From the table.
   * @param table The table to select from.
   * @example
   * const query = queryBuilder.select('*').from('table');
   */
  from(table: string): this
  /**
   * From the result of a raw SQL query.
   * @param sql The SQL query to execute.
   * @param bindings The binding parameters for the SQL query.
   * @example
   * const query = queryBuilder.select('*').fromRaw('SELECT * FROM table WHERE column1 = ?', ['value']);
   */
  fromRaw(sql: string, bindings?: Bindings): this
}

export interface QueryOptions {
  sqlBuilder: SQLBuilder
}

export abstract class BaseQuery<T> {
  protected options: QueryOptions
  protected get sqlBuilder() {
    return this.options.sqlBuilder
  }
  constructor(options: QueryOptions) {
    this.options = options
  }
  abstract toSQL(): SQLWithBindings | SQLWithBindings[]
}

export interface ISelectQuery<T>
  extends IWhereImpl<T>,
    IOrderByImpl<T>,
    IGroupByImpl<T>,
    ILimitImpl,
    IFromImpl {
  /**
   * Select columns from the query.
   * @param columns The columns to select from the table.
   * @example
   * const query = queryBuilder.select(['column1', 'column2']);
   * @example
   * const query = queryBuilder.select('*');
   * @default '*'
   */
  select(columns?: SelectColumn<T> | SelectColumn<T>[]): this

  /**
   * Specify the number of records to skip.
   * @param offset The number of records to skip before starting to return results.
   * @example
   * const query = queryBuilder.select('*').from('table').offset(10);
   */
  offset(offset: number): this
}

export interface IUpdateQuery<T>
  extends IWhereImpl<T>,
    IReturningImpl<T>,
    IOrderByImpl<T>,
    ILimitImpl {
  /**
   * Update records in the table.
   * @param table The table to update.
   * @param values The values to update.
   * @example
   * const query = queryBuilder.update('users', { name: 'John' });
   */
  update(table: string, values: Partial<T>): IUpdateQuery<T>
  /**
   * Update records using raw SQL.
   * @param sql The SQL query to execute.
   * @param bindings The binding parameters for the SQL query.
   * @example
   * const query = queryBuilder.updateRaw('UPDATE users SET name = ?', ['John']);
   */
  updateRaw(sql: string, bindings?: Bindings): IUpdateQuery<T>
}

export interface IDeleteQuery<T>
  extends IWhereImpl<T>,
    IReturningImpl<T>,
    ILimitImpl,
    IFromImpl {
  /**
   * Delete records from the table.
   * @example
   * const query = queryBuilder.delete();
   */
  delete(): IDeleteQuery<T>
}

export interface IInsertQuery<T> extends IReturningImpl<T> {
  /**
   * Insert records into the table.
   * @param table The table to insert into.
   * @param values The values to insert.
   * @example
   * const query = queryBuilder.insert('users');
   */
  insert(tableName: string): IInsertQuery<T>
  /**
   * Insert values into the table.
   * @param values The values to insert.
   * @example
   * const query = queryBuilder.insert('users').values({ name: 'John', age: 25 });
   * @description When passing in items with columns that do not align, the result will become multiple SQLWithBindings
   */
  values(values: Partial<T> | Partial<T>[]): IInsertQuery<T>
  /**
   * Specify the target column for the on conflict clause.
   * @param targetColumn The column to target for the on conflict clause.
   * @description
   * Because omitting conflict_target causes SQLite to check all uniqueness constraints, there may be a performance overhead in some cases.
   * If you know that conflicts will only occur on certain columns, it is best to specify those columns explicitly to increase efficiency.
   * @example
   * const query = queryBuilder.insert('users').values({ name: 'John', age: 25 }).onConflict('name').doUpdate({ age: 26 });
   */
  onConflict(targetColumn?: NoRowIdColumn<T>): IInsertQuery<T>
  /**
   * Specify the action to take if a conflict occurs.
   * @since sqlite3.24 like `ignore`
   * @example
   * const query = queryBuilder.insert('users').values({ name: 'John', age: 25 }).onConflict('name').doNothing();
   */
  doNothing(): IInsertQuery<T>
  /**
   * Specify the action to take if a conflict occurs.
   * @since sqlite3.24
   * @example
   * const query = queryBuilder.insert('users').values({ name: 'John', age: 25 }).onConflict('name').doUpdate({
   *  excluded:{name:"excluded.name"},
   *  merge:{age:26}
   * });
   */
  doUpdate(value: {
    excluded?: DoUpdateExcludeValues<T>
    merge?: Partial<T>
  }): IInsertQuery<T>
  /**
   * Action: When a conflict occurs, the transaction is rolled back to the previous savepoint and the current transaction is terminated.
   * Usage scenarios: Typically used in scenarios where transactional integrity needs to be ensured. If a conflict occurs, the entire transaction will be undone.
   */
  rollback(): IInsertQuery<T>
  /**
   * Action: When a conflict occurs, the current statement is aborted, but the transaction is not rolled back.
   * The operation already performed is still valid.
   * Usage scenario: This is the default behavior of SQLite and is suitable for most situations.
   */
  abort(): IInsertQuery<T>
  /**
   * Action: When a conflict occurs, the current statement is aborted, but the previous operation is not rolled back.
   * Difference from ABORT: FAIL does not roll back some operations of the current statement, whereas ABORT rolls back all operations of the current statement.
   */
  fail(): IInsertQuery<T>
  /**
   * Action: When a conflict occurs, the operation is ignored.
   * Usage scenario: This is suitable for scenarios where conflicts are expected and should be handled gracefully.
   */
  ignore(): IInsertQuery<T>
  /**
   * Action: When a conflict occurs, the old record is deleted and a new record is inserted.
   * Use case: For situations where you want to replace existing records in the event of a conflict.
   */
  replace(): IInsertQuery<T>
}

export type PrefixExcludeValue<T> =
  `excluded.${Exclude<keyof T, 'rowid'> & string}`

export type DoUpdateExcludeValues<T> = Partial<{
  [K in keyof T]: PrefixExcludeValue<T>
}>
