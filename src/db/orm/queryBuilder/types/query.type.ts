export type Keyof<T> = keyof T & string

export interface QueryDescription<T> {
  selectClauses: SelectClause<T>[]
  fromClauses: FromClause[]
  whereClauses: WhereClause<T>[]
  orderByClauses: OrderByClause<T>[]
  groupByClauses: GroupByClause<T>[]
  offsetValue?: number
  limitValue?: number
}
/**
 * Convert QueryBuilder description object {@link QueryDescription} to SQL string
 */
export type SQLBuilder = (description: QueryDescription<any>) => string

export interface WhereConditionDescription{
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
export type OrderByNulls = 'FIRST' | 'LAST'

export interface Raw {
  sql: string
  bindings?: string[] | Record<string, any>
}
//#region Classes and Interfaces
export interface SelectClause<T = any> {
  rule: Keyof<T> | string
}

export interface FromClause {
  rule?: string
  raw?: Raw
}

export interface WhereClause<T = any> {
  rule?: {
    type: WhereType
    condition: WhereCondition<T>
  }
  raw?: Raw
}

export interface OrderByClause<T = any> {
  rule?: {
    column: keyof T
    direction?: OrderByType
    nulls?: OrderByNulls
  }
  raw?: Raw
}

export interface GroupByClause<T = any> {
  rule?: {
    column: keyof T
  }
  raw?: Raw
}
//#endregion

export interface IQueryBuilderCommonMethods<T> {
  /**
   * Select columns from the query.
   * @param columns The columns to select from the table.
   * @example
   * const query = queryBuilder.select(['column1', 'column2']);
   * @example
   * const query = queryBuilder.select('*');
   * @default '*'
   */
  select(columns?: (keyof T)[] | string): this
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
   * @example
   * const query = queryBuilder.select('*').fromRaw('SELECT * FROM table WHERE column1 = :value', { value: 'value' });
   */
  fromRaw(sql: string, bindings: string[] | Record<string, any>): this
  /**
   * Specify the conditions for the 'WHERE' clause.
   * @param conditions The conditions to filter the query results.
   * @example
   * const query = queryBuilder.select('*').from('table').where({ column1: 'value' });
   */
  where(conditions: WhereCondition<T>): this
  orWhere(conditions: WhereCondition<T>): this
  /**
   * Specify the conditions for the 'WHERE' clause using a raw SQL query.
   * @param sql The SQL query to execute
   * @param bindings The binding parameters for the SQL query.
   * @example
   * const query = queryBuilder.select('*').from('table').whereRaw('column1 = ?', ['value']);
   * @example
   * const query = queryBuilder.select('*').from('table').whereRaw('column1 = :value', { value: 'value' });
   */
  whereRaw(sql: string, bindings: string[] | Record<string, any>): this
  /**
   * Specify the number of records to skip.
   * @param offset The number of records to skip before starting to return results.
   * @example
   * const query = queryBuilder.select('*').from('table').offset(10);
   */
  offset(offset: number): this
  /**
   * Specify the number of records to return.
   * @param limit The number of records to return.
   * @example
   * const query = queryBuilder.select('*').from('table').limit(10);
   */
  limit(limit: number): this
  /**
   * Specify the order of the results.
   * @param column The column to order by.
   * @param direction The direction to order by.
   * - 'ASC' for ascending order.
   * - 'DESC' for descending order.
   * default: 'ASC'
   * @param nulls The order of null values.
   * - 'FIRST' for null values first.
   * - 'LAST' for null values last.
   * @example
   * const query = queryBuilder.select('*').from('table').orderBy('column1', 'ASC', 'LAST');
   */
  orderBy(column: keyof T, direction?: OrderByType, nulls?: OrderByNulls): this
  /**
   * Specify the order of the results using a raw SQL query.
   * @param sql The SQL query to execute.
   * @example
   * const query = queryBuilder.select('*').from('table').orderByRaw('column1 ASC NULLS LAST');
   */
  orderByRaw(sql: string): this
  /**
   * Specify the grouping of the results.
   * @param column The column to group by.
   * @example
   * const query = queryBuilder.select('*').from('table').groupBy('column1');
   */
  groupBy(column: keyof T): this
  /**
   * Specify the grouping of the results using a raw SQL query.
   * @param sql The SQL query to execute.
   * @example
   * const query = queryBuilder.select('*').from('table').groupByRaw('column1');
   */
  groupByRaw(sql: string): this
}
