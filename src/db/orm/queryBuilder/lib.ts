import { QueryBuilder } from './query'
import { insertUnit } from './sqlBuilder/units/insert'
import { InsertQuery } from './query/insert'
import { Sqlite3SQLBuilder } from './sqlBuilder/sqlite3'

export * from './query'
export * from './types/query.type'
export * from './utils'

const iq = new InsertQuery<{
  mid: string
  name: string
  age: number
  profile?: string
}>({
  sqlBuilder: Sqlite3SQLBuilder,
})

iq.insert('user')
  .values([
    { mid: 'm1', name: 'A', age: 1 },
    { mid: 'm2', name: 'B', age: 2 },
    { mid: 'm4', name: '1', age: 4, profile: '123' },
    { mid: 'm7', name: '3', age: 7, profile: '123' },
  ])
  .onConflict()
  .doUpdate({
    excluded: { age: 'excluded.age' },
    merge: { name: 'Updated' },
  })

const res = iq.toSQL()

const sql = res.map((r) => r[0]).join('')
const bind = res.map((r) => r[1]).flat()

console.log(sql, bind)
