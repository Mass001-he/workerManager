import type { UpdateClause, SQLWithBindings } from '../../types/query.type'
import { quotes, validateBindings } from '../../utils'

export const updateUnit = (updateClauses?: UpdateClause[]): SQLWithBindings => {
  if (updateClauses === undefined || updateClauses.length === 0) {
    return ['', []]
  }

  if (updateClauses.length > 1) {
    throw new Error('Multiple UPDATE clauses are not supported')
  }

  const clause = updateClauses[0]!
  let sql = ''
  const bindings: any[] = []

  if (clause.raw) {
    // Handle raw SQL
    sql = clause.raw.sql
    if (clause.raw.bindings) {
      bindings.push(...clause.raw.bindings)
    }
  } else if (clause.rule) {
    // Handle rule-based update
    const { table, values } = clause.rule
    const setColumns: string[] = []

    // Sort keys to ensure consistent order
    const sortedKeys = Object.keys(values).sort()

    sortedKeys.forEach((key) => {
      setColumns.push(`${quotes(key)} = ?`)
      bindings.push(values[key])
    })

    if (setColumns.length === 0) {
      throw new Error('No columns provided for UPDATE')
    }

    sql = `UPDATE ${quotes(table)} SET ${setColumns.join(', ')}`
  }

  const result: SQLWithBindings = [sql, bindings]

  if (bindings.length > 0) {
    validateBindings(result)
  }

  return result
} 