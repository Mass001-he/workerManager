import type { SelectClause, SQLWithBindings } from '../../types/query.type'
import { quotes } from '../../utils'

export const selectUnit = (selectClauses?: SelectClause[]): SQLWithBindings => {
  const hasSelectClauses =
    selectClauses !== undefined && selectClauses.length > 0
  const query: string[] = []
  if (hasSelectClauses === false) {
    query.push('*')
  } else {
    selectClauses.forEach((selectClause) => {
      if (selectClause.rule === '*') {
        query.push('*')
      } else {
        query.push(quotes(selectClause.rule))
      }
    })
  }
  return ['SELECT ' + query.join(', '), []]
}
