import {
  type IDeleteQuery,
  type Bindings,
  type SelectColumn,
  type WhereCondition,
  type SQLWithBindings,
  type DeleteClause,
  BaseQuery,
  type QueryOptions,
} from '../types/query.type'
import { semicolon } from '../utils'
import { FromMixin, LimitMixin, ReturningMixin, WhereMixin } from './mixin'

export class DeleteQuery<T> extends BaseQuery<T> implements IDeleteQuery<T> {
  protected deleteClauses: DeleteClause[] = []
  // Mixins
  protected whereMixin: WhereMixin<T>
  protected returningMixin: ReturningMixin<T>
  protected limitMixin: LimitMixin
  protected fromMixin: FromMixin
  protected isCalledDelete = false

  constructor(options: QueryOptions) {
    super(options)
    this.whereMixin = new WhereMixin(this.sqlBuilder)
    this.returningMixin = new ReturningMixin(this.sqlBuilder)
    this.limitMixin = new LimitMixin(this.sqlBuilder)
    this.fromMixin = new FromMixin(this.sqlBuilder)
  }

  delete(): this {
    if (this.isCalledDelete) {
      throw new Error('Multiple DELETE clauses are not supported')
    }
    this.isCalledDelete = true
    return this
  }

  where(conditions: WhereCondition<T>): this {
    this.whereMixin.where(conditions)
    return this
  }

  orWhere(conditions: WhereCondition<T>): this {
    this.whereMixin.orWhere(conditions)
    return this
  }

  whereRaw(sql: string, bindings?: Bindings): this {
    this.whereMixin.whereRaw(sql, bindings)
    return this
  }

  orWhereRaw(sql: string, bindings?: Bindings): this {
    this.whereMixin.orWhereRaw(sql, bindings)
    return this
  }

  returning(columns?: SelectColumn<T> | SelectColumn<T>[]): this {
    this.returningMixin.returning(columns)
    return this
  }

  returningRaw(sql: string, bindings?: Bindings): this {
    this.returningMixin.returningRaw(sql, bindings)
    return this
  }

  limit(limit: number): this {
    this.limitMixin.limit(limit)
    return this
  }

  from(table: string): this {
    this.fromMixin.from(table)
    return this
  }

  fromRaw(sql: string, bindings?: Bindings): this {
    this.fromMixin.fromRaw(sql, bindings)
    return this
  }

  toSQL(): SQLWithBindings {
    let sql = ''
    let bindings: Bindings = []

    const pushResult = (result: SQLWithBindings) => {
      const noSpaceResult = result[0].trim()
      if (noSpaceResult !== '') {
        if (sql !== '') {
          sql += ' '
        }
        sql += noSpaceResult
        bindings.push(...result[1])
      }
    }

    // Process DELETE
    pushResult(['DELETE', []])

    // Add FROM clause if exists
    pushResult(this.fromMixin.toSQL())

    // Add WHERE clause if exists
    pushResult(this.whereMixin.toSQL())

    // Add LIMIT clause if exists
    pushResult(this.limitMixin.toSQL())

    // Add RETURNING clause if exists
    pushResult(this.returningMixin.toSQL())

    if (sql === '') {
      throw new Error('No valid SQL generated')
    }

    sql = semicolon(sql)
    return [sql, bindings]
  }
}
