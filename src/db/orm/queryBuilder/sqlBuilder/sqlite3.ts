import type {
  SelectClause,
  SQLWithBindings,
  FromClause,
  WhereClause,
  GroupByClause,
  OrderByClause,
  SQLBuilder,
  ReturningClause,
  InsertClause,
  UpdateClause,
} from '../types/query.type'
import { fromUnit } from './units/from'
import { selectUnit } from './units/select'
import { whereUnit } from './units/where'
import { groupUnit } from './units/group'
import { orderUnit } from './units/order'
import { offsetUnit } from './units/offset'
import { limitUnit } from './units/limit'
import { returningUnit } from './units/returning'
import { insertUnit } from './units/insert'
import { updateUnit } from './units/update'

export const Sqlite3SQLBuilder: SQLBuilder = {
  select: (clauses?: SelectClause[]): SQLWithBindings => {
    return selectUnit(clauses)
  },
  from: (clauses?: FromClause[]): SQLWithBindings => {
    return fromUnit(clauses)
  },
  where: (clauses?: WhereClause[]): SQLWithBindings => {
    return whereUnit(clauses)
  },
  groupBy: (clauses?: GroupByClause[]): SQLWithBindings => {
    return groupUnit(clauses)
  },
  orderBy: (clauses?: OrderByClause[]): SQLWithBindings => {
    return orderUnit(clauses)
  },
  offset: (value?: number): SQLWithBindings => {
    return offsetUnit(value)
  },
  limit: (value?: number): SQLWithBindings => {
    return limitUnit(value)
  },
  returning: (clauses?: ReturningClause[]): SQLWithBindings => {
    return returningUnit(clauses)
  },
  insert: (clauses: InsertClause[]): SQLWithBindings => {
    return insertUnit(clauses)
  },
  update: (clauses: UpdateClause[]): SQLWithBindings => {
    return updateUnit(clauses)
  },
}
