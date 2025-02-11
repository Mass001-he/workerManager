import type {
  FromClause,
  QueryDescription,
  SelectClause,
  WhereClause,
} from '../types/query.type'
import { quotes, bracket, isWhereConditionDescription } from '../utils'
import { fromUnit } from './units/from'
import { selectUnit } from './units/select'
import { whereUnit } from './units/where'

export function Sqlite3SQLBuilder(description: QueryDescription<any>): string {
  const {
    selectClauses,
    fromClauses,
    whereClauses,
    orderByClauses,
    groupByClauses,
    offsetValue,
    limitValue,
  } = description

  let query = ``
  const selectStr = selectUnit(selectClauses)
  const fromStr = fromUnit(fromClauses)
  query += `${selectStr} ${fromStr} `
  if (whereClauses.length > 0) {
    query += whereUnit(whereClauses)
  }

  return query
}
