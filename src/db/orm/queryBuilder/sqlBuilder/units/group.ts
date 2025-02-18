import type {
  Bindings,
  GroupByClause,
  SQLWithBindings,
} from '../../types/query.type'
import { quotes, validateBindings } from '../../utils'

export const groupUnit = (
  groupByClauses?: GroupByClause[],
): SQLWithBindings => {
  if (groupByClauses === undefined || groupByClauses.length === 0) {
    return ['', []]
  }

  const groups: string[] = []
  const bindings: Bindings = []

  groupByClauses.forEach((clause) => {
    if (clause.rule) {
      const { column } = clause.rule

      let groupStr = `${quotes(column as string)}`

      groups.push(groupStr)
    } else if (clause.raw) {
      groups.push(clause.raw.sql)
      if (clause.raw.bindings) {
        bindings.push(...clause.raw.bindings)
      }
    }
  })

  const sql = groups.length > 0 ? `GROUP BY ${groups.join(', ')}` : ''
  const result: SQLWithBindings = [sql, bindings]

  if (bindings.length > 0) {
    validateBindings(result)
  }

  return result
}
