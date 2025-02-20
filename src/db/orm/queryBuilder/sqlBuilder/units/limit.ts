import { SQLWithBindings } from '../../types/query.type'
import { isPositiveInteger } from '../../utils'

export const limitUnit = (limitValue?: number): SQLWithBindings => {
  if (limitValue === undefined) {
    return ['', []]
  }
  if (isNaN(limitValue)) {
    throw new Error('Invalid limit value')
  }
  if (typeof limitValue !== 'number') {
    throw new Error('Invalid limit value')
  }
  if (isPositiveInteger(limitValue) === false) {
    throw new Error('Invalid limit value')
  }

  return [`LIMIT ${limitValue}`, []]
}
