import {
  type IUpdateQuery,
  type Bindings,
  type SelectColumn,
  type WhereCondition,
  type SQLWithBindings,
  type UpdateClause,
  BaseQuery,
  type QueryOptions,
  type Column,
  type OrderByType,
} from '../types/query.type'
import { semicolon } from '../utils'
import { LimitMixin, ReturningMixin, WhereMixin, OrderByMixin } from './mixin'

export class UpdateQuery<T> extends BaseQuery<T> implements IUpdateQuery<T> {
  protected updateClauses: UpdateClause<T>[] = []
  // Mixins
  protected whereMixin: WhereMixin<T>
  protected returningMixin: ReturningMixin<T>
  protected limitMixin: LimitMixin
  protected orderByMixin: OrderByMixin<T>

  constructor(options: QueryOptions) {
    super(options)
    this.whereMixin = new WhereMixin(this.sqlBuilder)
    this.returningMixin = new ReturningMixin(this.sqlBuilder)
    this.limitMixin = new LimitMixin(this.sqlBuilder)
    this.orderByMixin = new OrderByMixin(this.sqlBuilder)
  }

  update(table: string, values: Partial<T>): this {
    this.updateClauses.push({
      rule: {
        table,
        values,
      },
    })
    return this
  }

  updateRaw(sql: string, bindings?: Bindings): this {
    this.updateClauses.push({
      raw: {
        sql,
        bindings,
      },
    })
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

  orderBy(column: Column<T>, direction?: OrderByType): this {
    this.orderByMixin.orderBy(column, direction)
    return this
  }

  orderByRaw(sql: string, bindings?: Bindings): this {
    this.orderByMixin.orderByRaw(sql, bindings)
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

    // Process UPDATE
    pushResult(this.sqlBuilder.update(this.updateClauses))

    // Add WHERE clause if exists
    pushResult(this.whereMixin.toSQL())

    // Add ORDER BY clause if exists
    pushResult(this.orderByMixin.toSQL())

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
