import { orderUnit } from '../order'
import type { OrderByClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('orderUnit', () => {
  test('Empty sort should return empty SQL', () => {
    const result = orderUnit([])
    expect(result).toEqual(['', []])
  })

  test('Single column sort should generate basic ORDER BY statement', () => {
    const result = orderUnit([{ rule: { column: 'name' } }])
    expect(result).toEqual(['ORDER BY "name"', []])
  })

  test('Specified sort direction should include direction keyword', () => {
    const result = orderUnit([{ rule: { column: 'age', direction: 'DESC' } }])
    expect(result).toEqual(['ORDER BY "age" DESC', []])
  })

  test('Multiple column sort should use comma separator', () => {
    const result = orderUnit([
      { rule: { column: 'name', direction: 'ASC' } },
      { rule: { column: 'age', direction: 'DESC' } },
    ])
    expect(result).toEqual(['ORDER BY "name" ASC, "age" DESC', []])
  })

  test('Raw SQL sort should use provided SQL directly', () => {
    const result = orderUnit([
      {
        raw: {
          sql: 'RANDOM()',
        },
      },
    ])
    expect(result).toEqual(['ORDER BY RANDOM()', []])
  })

  test('Raw SQL with bindings should handle parameters correctly', () => {
    const result = orderUnit([
      {
        raw: {
          sql: 'CASE WHEN id = ? THEN 0 ELSE 1 END',
          bindings: [1],
        },
      },
    ])
    expect(result).toEqual(['ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END', [1]])
  })

  test('Mixed rules and Raw SQL should combine correctly', () => {
    const result = orderUnit([
      { rule: { column: 'name', direction: 'ASC' } },
      { raw: { sql: 'RANDOM()' } },
    ])
    expect(result).toEqual(['ORDER BY "name" ASC, RANDOM()', []])
  })
})
