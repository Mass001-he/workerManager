import { Sqlite3SQLBuilder } from '../sqlBuilder/sqlite3'
import type { QueryOptions, SelectColumn } from '../types/query.type'
import { SelectQuery } from './select'
import { InsertQuery } from './insert'
import { UpdateQuery } from './update'
import { DeleteQuery } from './delete'


export class QueryBuilder<T> {
  private options: QueryOptions
  constructor(options?: QueryOptions) {
    this.options = options ?? {
      sqlBuilder: Sqlite3SQLBuilder,
    }
  }

  select(columns?: SelectColumn<T> | SelectColumn<T>[]) {
    const query = new SelectQuery<T>(this.options)
    query.select(columns)
    return query
  }

  insert(table: string) {
    const query = new InsertQuery<T>(this.options)
    query.insert(table)
    return query
  }

  update(table: string, values: Partial<T>) {
    const query = new UpdateQuery<T>(this.options)
    query.update(table, values)
    return query
  }

  delete(tableName?: string) {
    const query = new DeleteQuery<T>(this.options)
    query.delete()
    if (tableName) {
      query.from(tableName)
    }
    return query
  }
}
