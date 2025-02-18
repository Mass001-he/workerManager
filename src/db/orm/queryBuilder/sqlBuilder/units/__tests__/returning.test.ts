import { returningUnit } from '../returning'
import type { ReturningClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('returningUnit', () => {
  const testCases: Array<{
    name: string
    input: ReturningClause[]
    expected: [string, any[]]
  }> = [
    {
      name: 'Empty RETURNING clause',
      input: [],
      expected: ['', []],
    },
    {
      name: 'Return all columns',
      input: [{ rule: '*' }],
      expected: ['RETURNING *', []],
    },
    {
      name: 'Return single column',
      input: [{ rule: 'id' }],
      expected: ['RETURNING "id"', []],
    },
    {
      name: 'Return multiple columns',
      input: [{ rule: 'id' }, { rule: 'name' }],
      expected: ['RETURNING "id", "name"', []],
    },
    {
      name: 'Raw SQL returning',
      input: [
        {
          raw: {
            sql: 'COUNT(*) as count',
          },
        },
      ],
      expected: ['RETURNING COUNT(*) as count', []],
    },
    {
      name: 'Raw SQL with bindings',
      input: [
        {
          raw: {
            sql: 'CASE WHEN id = ? THEN ? ELSE ? END as result',
            bindings: [1, 'active', 'inactive'],
          },
        },
      ],
      expected: [
        'RETURNING CASE WHEN id = ? THEN ? ELSE ? END as result',
        [1, 'active', 'inactive'],
      ],
    },
    {
      name: 'Mixed rules and Raw SQL',
      input: [
        { rule: 'id' },
        {
          raw: {
            sql: 'created_at',
          },
        },
      ],
      expected: ['RETURNING "id", created_at', []],
    },
  ]

  testCases.forEach(({ name, input, expected }) => {
    test(name, () => {
      const result = returningUnit(input)
      expect(result).toEqual(expected)
    })
  })

  test('Error handling - Binding count mismatch', () => {
    const input: ReturningClause[] = [
      {
        raw: {
          sql: 'CASE WHEN id = ? THEN ? ELSE ? END',
          bindings: [1, 'active'], // Only provided two bindings but SQL has three placeholders
        },
      },
    ]
    expect(() => returningUnit(input)).toThrow(/SQL binding count mismatch/)
  })
}) 