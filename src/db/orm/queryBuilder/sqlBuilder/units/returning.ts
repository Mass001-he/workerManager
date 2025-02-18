import type { ReturningClause, SQLWithBindings } from '../../types/query.type'
import { quotes, validateBindings } from '../../utils'

export const returningUnit = (
  returningClauses?: ReturningClause[],
): SQLWithBindings => {
  if (returningClauses === undefined || returningClauses.length === 0) {
    return ['', []]
  }

  const columns: string[] = []
  const bindings: any[] = []

  returningClauses.forEach((clause) => {
    if (clause.rule) {
      // Handle rule-based returning
      columns.push(clause.rule === '*' ? '*' : quotes(clause.rule))
    } else if (clause.raw) {
      // Handle raw SQL returning
      columns.push(clause.raw.sql)
      if (clause.raw.bindings) {
        bindings.push(...clause.raw.bindings)
      }
    }
  })

  if (columns.length === 0) {
    return ['', []]
  }

  const sql = `RETURNING ${columns.join(', ')}`
  const result: SQLWithBindings = [sql, bindings]

  if (bindings.length > 0) {
    validateBindings(result)
  }

  return result
}
