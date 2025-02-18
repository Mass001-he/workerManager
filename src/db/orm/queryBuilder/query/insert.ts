import {
  type IInsertQuery,
  type Bindings,
  type SelectColumn,
  type SQLWithBindings,
  BaseQuery,
  type QueryOptions,
  type NoRowIdColumn,
  type DoUpdateExcludeValues,
} from '../types/query.type'
import { bracket, equalStr, semicolon, spaceLeft, spaceRight } from '../utils'
import { ReturningMixin, WhereMixin } from './mixin'

export class InsertQuery<T> extends BaseQuery<T> implements IInsertQuery<T> {
  protected _tableName?: string
  protected _values: Partial<T>[] = []
  protected _callOnConflict = false
  protected _onConflictColumns: string[] = []
  protected _onConflictClause?: string
  protected _onConflictBindings: Bindings = []
  // Mixins
  protected whereMixin: WhereMixin<T>
  protected returningMixin: ReturningMixin<T>

  constructor(options: QueryOptions) {
    super(options)
    this.whereMixin = new WhereMixin(this.sqlBuilder)
    this.returningMixin = new ReturningMixin(this.sqlBuilder)
  }

  insert(tableName: string) {
    if (tableName.trim() === '') {
      throw new Error('Table name is required')
    }
    this._tableName = tableName
    return this
  }

  values(data: T | T[]): this {
    if (Array.isArray(data)) {
      this._values.push(...data)
    } else {
      this._values.push(data)
    }

    return this
  }

  onConflict(column?: NoRowIdColumn<T>): this {
    this._callOnConflict = true
    if (column) {
      this._onConflictColumns.push(column)
    }
    return this
  }

  doNothing(): this {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'DO NOTHING'
    return this
  }

  doUpdate(value: {
    excluded?: DoUpdateExcludeValues<T>
    merge?: Partial<T>
  }): this {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }

    // Check for duplicate properties between excluded and merge
    if (value.excluded && value.merge) {
      const excludedKeys = new Set(Object.keys(value.excluded))
      const duplicateKeys = Object.keys(value.merge).filter((key) =>
        excludedKeys.has(key),
      )
      if (duplicateKeys.length > 0) {
        throw new Error(
          `Properties ${duplicateKeys.join(', ')} cannot be set in both excluded and merge objects`,
        )
      }
    }

    let sql = 'DO UPDATE SET'
    const bindings: Bindings = []
    const sets: string[] = []

    // Handle excluded values
    if (value.excluded) {
      Object.keys(value.excluded).forEach((key) => {
        //@ts-ignore
        sets.push(equalStr(key, value.excluded![key]))
      })
    }

    // Handle merge values
    if (value.merge) {
      Object.entries(value.merge).forEach(([key, val]) => {
        sets.push(equalStr(key, '?'))
        bindings.push(val as string | number)
      })
    }

    if (sets.length === 0) {
      throw new Error('No values to update')
    }

    sql += spaceLeft(sets.join(', '))

    this._onConflictClause = sql

    this._onConflictBindings = bindings
    return this
  }

  rollback() {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'ROLLBACK'
    return this
  }

  abort() {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'ABORT'
    return this
  }

  fail() {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'FAIL'
    return this
  }

  ignore() {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'IGNORE'
    return this
  }

  replace() {
    if (this._onConflictClause) {
      throw new Error('On conflict clause already set')
    }
    this._onConflictClause = 'REPLACE'
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

  toSQL(): SQLWithBindings[] {
    if (!this._tableName) {
      throw new Error('Table name is required')
    }

    if (this._values.length === 0) {
      throw new Error('No values to insert')
    }

    const results: SQLWithBindings[] = []

    const inserts = this.sqlBuilder.insert([
      {
        rule: {
          table: this._tableName,
          values: this._values,
        },
      },
    ])

    inserts.forEach((insert) => {
      let sql = insert[0]
      const bindings = insert[1]
      const pushResult = (result: SQLWithBindings) => {
        const noSpaceResult = result[0].trim()
        if (noSpaceResult !== '') {
          if (sql !== '') {
            sql = spaceRight(sql)
          }
          sql += noSpaceResult
          bindings.push(...result[1])
        }
      }

      if (this._callOnConflict) {
        pushResult(['ON CONFLICT', []])
        if (this._onConflictColumns.length > 0) {
          pushResult([bracket(this._onConflictColumns.join(', ')), []])
        }
        if (this._onConflictClause) {
          pushResult([this._onConflictClause, this._onConflictBindings])
        }
      }

      pushResult(this.returningMixin.toSQL())

      if (sql === '') {
        throw new Error('No valid SQL generated')
      }

      sql = semicolon(sql)
      results.push([sql, bindings])
    })

    return results
  }
}
