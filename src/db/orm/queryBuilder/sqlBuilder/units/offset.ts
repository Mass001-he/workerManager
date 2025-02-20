import { SQLWithBindings } from '../../types/query.type'

export const offsetUnit = (offsetValue?: number): SQLWithBindings => {
  if (offsetValue === undefined) {
    return ['', []]
  }
  if (isNaN(offsetValue)) {
    throw new Error('Invalid offset value')
  }
  if (typeof offsetValue !== 'number') {
    throw new Error('Invalid offset value')
  }
  if (Number.isInteger(offsetValue) === false || offsetValue < 0) {
    throw new Error('Invalid offset value')
  }
  if (offsetValue === 0) {
    return ['', []]
  }
  return [`OFFSET ${offsetValue}`, []]
}
