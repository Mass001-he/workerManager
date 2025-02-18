import { SQLWithBindings } from '../../types/query.type'
import { isPositiveInteger } from '../../utils'

export const limitUnit = (limitValue?: number): SQLWithBindings => {
  if (limitValue === undefined) {
    return ['', []]
  }
  if (isPositiveInteger(limitValue) === false) {
    throw new Error('Invalid limit value')
  }
  return ['LIMIT ?', [limitValue]]
}
