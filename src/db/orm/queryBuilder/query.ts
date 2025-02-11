import { Err, Ok, type Result } from '@wwog/good-design/rust'
import type {
  FromClause,
  GroupByClause,
  IQueryBuilderCommonMethods,
  Keyof,
  OrderByClause,
  OrderByNulls,
  OrderByType,
  QueryDescription,
  SelectClause,
  SQLBuilder,
  WhereClause,
  WhereCondition,
} from './types/query.type'
import { Sqlite3SQLBuilder } from './sqlBuilder/sqlite3'

export interface QueryBuilderOptions {
  builder?: SQLBuilder
}

/**
 * Used to generate a unified `QueryDescription` description object.
 *
 * Specific to SQLITE_WASM, but retains some extensibility. `SQL Builder` can be extended to generate additional dialects.
 *
 * @example
 * ```ts
 * const queryBuilder = new QueryBuilder<UserTable>()
 * queryBuilder
 *   .select(['name', 'age'])
 *   .from('users')
 *   .where({ age: { $gt: 18 } })
 *   .orderBy('name', 'ASC')
 * ```
 */
export class QueryBuilder<T> implements IQueryBuilderCommonMethods<T> {
  public description: QueryDescription<T> = {
    selectClauses: [],
    fromClauses: [],
    whereClauses: [],
    orderByClauses: [],
    groupByClauses: [],
    offsetValue: undefined,
    limitValue: undefined,
  }
  private builder: SQLBuilder

  constructor(options: QueryBuilderOptions = {}) {
    this.builder = options.builder || Sqlite3SQLBuilder
  }

  select(columns?: string | Keyof<T>[] | undefined): this {
    if (!columns) {
      this.description.selectClauses.push({ rule: '*' })
    } else if (typeof columns === 'string') {
      this.description.selectClauses.push({ rule: columns })
    } else {
      this.description.selectClauses.push(
        ...columns.map((col) => ({ rule: col })),
      )
    }
    return this
  }
  from(table: string): this {
    this.description.fromClauses.push({ rule: table })
    return this
  }
  fromRaw(sql: string, bindings?: string[] | Record<string, any>): this {
    this.description.fromClauses.push({ raw: { sql, bindings } })
    return this
  }
  where(condition: WhereCondition<T>): this {
    this.description.whereClauses.push({ rule: { type: 'AND', condition: condition } })
    return this
  }
  orWhere(condition: WhereCondition<T>): this {
    this.description.whereClauses.push({ rule: { type: 'OR', condition: condition } })
    return this
  }
  whereRaw(sql: string, bindings?: string[] | Record<string, any>): this {
    this.description.whereClauses.push({ raw: { sql, bindings } })
    return this
  }
  offset(offset: number): this {
    this.description.offsetValue = offset
    return this
  }
  limit(limit: number): this {
    this.description.limitValue = limit
    return this
  }
  orderBy(
    column: keyof T,
    direction?: OrderByType,
    nulls?: OrderByNulls,
  ): this {
    this.description.orderByClauses.push({ rule: { column, direction, nulls } })
    return this
  }
  orderByRaw(sql: string): this {
    this.description.orderByClauses.push({ raw: { sql } })
    return this
  }
  groupBy(column: keyof T): this {
    this.description.groupByClauses.push({ rule: { column } })
    return this
  }
  groupByRaw(sql: string): this {
    this.description.groupByClauses.push({ raw: { sql } })
    return this
  }
  toSQL(): Result<string, Error> {
    try {
      return Ok(this.builder(this.description))
    } catch (error) {
      if (error instanceof Error) {
        return Err(new Error('Failed to generate SQL: ' + error.message))
      }
      console.error(error)
      return Err(new Error('Failed to generate SQL'))
    }
  }
}
