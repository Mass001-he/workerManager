import {
  type ISelectQuery,
  type Bindings,
  type Column,
  type OrderByType,
  type QueryOptions,
  type SelectColumn,
  type WhereCondition,
  type SelectClause,
  type SQLWithBindings,
  BaseQuery,
} from '../types/query.type'
import { semicolon } from '../utils'
import {
  FromMixin,
  GroupByMixin,
  LimitMixin,
  OrderByMixin,
  WhereMixin,
} from './mixin'

export class SelectQuery<T> extends BaseQuery<T> implements ISelectQuery<T> {
  protected selectClauses: SelectClause[] = []
  protected offsetValue?: number
  // Mixins
  protected whereMixin: WhereMixin<T>
  protected fromMixin: FromMixin
  protected orderByMixin: OrderByMixin<T>
  protected groupByMixin: GroupByMixin<T>
  protected limitMixin: LimitMixin

  constructor(options: QueryOptions) {
    super(options)

    this.whereMixin = new WhereMixin(this.sqlBuilder)
    this.fromMixin = new FromMixin(this.sqlBuilder)
    this.orderByMixin = new OrderByMixin(this.sqlBuilder)
    this.groupByMixin = new GroupByMixin(this.sqlBuilder)
    this.limitMixin = new LimitMixin(this.sqlBuilder)
  }

  // Select implementation
  select(columns?: SelectColumn<T> | SelectColumn<T>[]) {
    if (columns === undefined) {
      this.selectClauses.push({ rule: '*' })
    } else if (typeof columns === 'string') {
      this.selectClauses.push({ rule: columns })
    } else {
      columns.forEach((column) => {
        this.selectClauses.push({ rule: column })
      })
    }
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

  orderBy(column: Column<T>, direction?: OrderByType): this {
    this.orderByMixin.orderBy(column, direction)
    return this
  }

  orderByRaw(sql: string, bindings?: Bindings): this {
    this.orderByMixin.orderByRaw(sql, bindings)
    return this
  }

  groupBy(column: Column<T>): this {
    this.groupByMixin.groupBy(column)
    return this
  }

  groupByRaw(sql: string, bindings?: Bindings): this {
    this.groupByMixin.groupByRaw(sql, bindings)
    return this
  }

  limit(limit: number): this {
    this.limitMixin.limit(limit)
    return this
  }

  offset(offset: number): this {
    this.offsetValue = offset
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

    pushResult(this.sqlBuilder.select(this.selectClauses))
    pushResult(this.fromMixin.toSQL())
    pushResult(this.whereMixin.toSQL())
    pushResult(this.groupByMixin.toSQL())
    //HAVING
    pushResult(this.orderByMixin.toSQL())
    pushResult(this.limitMixin.toSQL())
    pushResult(this.sqlBuilder.offset(this.offsetValue))
    if (sql === '') {
      throw new Error('No valid SQL generated')
    }
    sql = semicolon(sql)
    return [sql, bindings]
  }
}
