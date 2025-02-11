import type { SelectClause } from '../../types/query.type'
import { quotes } from '../../utils'

export const selectUnit = (selectClauses: SelectClause[]) => {
  const hasSelectClauses = selectClauses.length > 0
  const query: string[] = []
  if (hasSelectClauses === false) {
    query.push('*')
  } else {
    selectClauses.forEach((selectClause) => {
      query.push(quotes(selectClause.rule))
    })
  }
  return 'SELECT ' + query.join(', ')
}
