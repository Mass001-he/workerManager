import type { FromClause } from '../../types/query.type'
import { bracket } from '../../utils'

export const fromUnit = (fromClauses: FromClause[]) => {
  if (fromClauses.length === 0) {
    throw new Error('FROM clause is required')
  }
  if (fromClauses.length > 1) {
    throw new Error('Multiple FROM clauses are not supported')
  }

  let query = ''
  for (let idx = 0; idx < fromClauses.length; idx++) {
    const element = fromClauses[idx]!
    if (element.rule) {
      query += bracket(element.rule)
    } else if (element.raw) {
      query += bracket(element.raw.sql)
    }
  }

  return 'FROM ' + query
}
