import type {
  Bindings,
  Column,
  FromClause,
  GroupByClause,
  IFromImpl,
  IGroupByImpl,
  ILimitImpl,
  IOrderByImpl,
  IReturningImpl,
  IWhereImpl,
  OrderByClause,
  OrderByType,
  ReturningClause,
  SelectColumn,
  SQLBuilder,
  SQLWithBindings,
  WhereClause,
  WhereCondition,
} from '../types/query.type'

export abstract class Mixin {
  constructor(protected builder: SQLBuilder) {}
  abstract toSQL(): SQLWithBindings
}

export class WhereMixin<T> extends Mixin implements IWhereImpl<T> {
  protected whereClauses: WhereClause[] = []
  where(conditions: WhereCondition<T>): this {
    this.whereClauses.push({
      rule: {
        type: 'AND',
        conditions,
      },
    })
    return this
  }
  orWhere(conditions: WhereCondition<T>): this {
    this.whereClauses.push({
      rule: {
        type: 'OR',
        conditions,
      },
    })
    return this
  }
  whereRaw(sql: string, bindings?: Bindings): this {
    this.whereClauses.push({
      raw: {
        sql,
        bindings,
        type: 'AND',
      },
    })
    return this
  }
  orWhereRaw(sql: string, bindings?: Bindings): this {
    this.whereClauses.push({
      raw: {
        sql,
        bindings,
        type: 'OR',
      },
    })
    return this
  }
  toSQL() {
    return this.builder.where(this.whereClauses)
  }
}

export class LimitMixin extends Mixin implements ILimitImpl {
  protected limitValue?: number
  limit(limit: number): this {
    this.limitValue = limit
    return this
  }
  toSQL() {
    return this.builder.limit(this.limitValue)
  }
}

export class OrderByMixin<T> extends Mixin implements IOrderByImpl<T> {
  protected orderByClauses: OrderByClause[] = []
  orderBy(column: Column<T>, direction?: OrderByType): this {
    this.orderByClauses.push({
      rule: {
        column,
        direction,
      },
    })
    return this
  }
  orderByRaw(sql: string, bindings?: Bindings): this {
    this.orderByClauses.push({
      raw: {
        sql,
        bindings,
      },
    })
    return this
  }
  toSQL() {
    return this.builder.orderBy(this.orderByClauses)
  }
}

export class GroupByMixin<T> extends Mixin implements IGroupByImpl<T> {
  protected groupByClauses: GroupByClause[] = []
  groupBy(column: Column<T>): this {
    this.groupByClauses.push({
      rule: {
        column,
      },
    })
    return this
  }
  groupByRaw(sql: string, bindings?: Bindings): this {
    this.groupByClauses.push({
      raw: {
        sql,
        bindings,
      },
    })
    return this
  }
  toSQL() {
    return this.builder.groupBy(this.groupByClauses)
  }
}

export class FromMixin extends Mixin implements IFromImpl {
  protected fromClauses: FromClause[] = []
  from(table: string): this {
    this.fromClauses.push({
      rule: table,
    })
    return this
  }
  fromRaw(sql: string, bindings?: Bindings): this {
    this.fromClauses.push({
      raw: {
        sql,
        bindings,
      },
    })
    return this
  }
  toSQL() {
    return this.builder.from(this.fromClauses)
  }
}

export class ReturningMixin<T> extends Mixin implements IReturningImpl<T> {
  protected returningClauses: ReturningClause[] = []
  returning(val?: SelectColumn<T> | SelectColumn<T>[]): this {
    if (val === undefined) {
      this.returningClauses.push({
        rule: '*',
      })
    } else if (Array.isArray(val)) {
      val.forEach((item) => {
        this.returningClauses.push({
          rule: item,
        })
      })
    } else {
      this.returningClauses.push({
        rule: val,
      })
    }
    return this
  }
  returningRaw(sql: string, bindings?: Bindings): this {
    this.returningClauses.push({
      raw: {
        sql,
        bindings,
      },
    })
    return this
  }
  toSQL() {
    return this.builder.returning(this.returningClauses)
  }
}
