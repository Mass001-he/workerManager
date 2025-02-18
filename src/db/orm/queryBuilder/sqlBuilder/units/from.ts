import type { FromClause, SQLWithBindings } from '../../types/query.type'
import { bracket, quotes, validateBindings } from '../../utils'

export const fromUnit = (fromClauses?: FromClause[]): SQLWithBindings => {
  if (fromClauses === undefined || fromClauses.length === 0) {
    throw new Error('FROM clause is required')
  }
  if (fromClauses.length > 1) {
    throw new Error('Multiple FROM clauses are not supported')
  }

  const fromClause = fromClauses[0]!
  let sql = ''
  let bindings: any[] = []

  if (fromClause.rule) {
    sql = quotes(fromClause.rule)
  } else if (fromClause.raw) {
    sql = fromClause.raw.sql
    bindings = fromClause.raw.bindings || []
    validateBindings([fromClause.raw.sql, bindings])
  }

  return [`FROM ${sql}`, bindings]
}
