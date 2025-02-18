import { groupUnit } from '../group'
import type { GroupByClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('groupUnit', () => {
  const testCases: Array<{
    name: string
    input: GroupByClause[]
    expected: [string, any[]]
  }> = [
    {
      name: 'Empty GROUP BY clause',
      input: [],
      expected: ['', []],
    },
    {
      name: 'Single column GROUP BY',
      input: [{ rule: { column: 'name' } }],
      expected: ['GROUP BY "name"', []],
    },
    {
      name: 'Multiple columns GROUP BY',
      input: [{ rule: { column: 'name' } }, { rule: { column: 'age' } }],
      expected: ['GROUP BY "name", "age"', []],
    },
    {
      name: 'Raw SQL GROUP BY',
      input: [
        {
          raw: {
            sql: 'SUBSTR(name, 1, 1)',
          },
        },
      ],
      expected: ['GROUP BY SUBSTR(name, 1, 1)', []],
    },
    {
      name: 'Raw SQL GROUP BY with bindings',
      input: [
        {
          raw: {
            sql: 'SUBSTR(name, 1, ?)',
            bindings: [1],
          },
        },
      ],
      expected: ['GROUP BY SUBSTR(name, 1, ?)', [1]],
    },
  ]

  testCases.forEach(({ name, input, expected }) => {
    test(name, () => {
      const result = groupUnit(input)
      expect(result).toEqual(expected)
    })
  })

  test('Error handling - Binding count mismatch', () => {
    const input: GroupByClause[] = [
      {
        raw: {
          sql: 'SUBSTR(name, 1, ?)',
          bindings: [1, 2], // Two bindings provided but SQL has only one placeholder
        },
      },
    ]
    expect(() => groupUnit(input)).toThrow(/SQL binding count mismatch/)
  })
})
