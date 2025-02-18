import { updateUnit } from '../update'
import type { UpdateClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('updateUnit', () => {
  const testCases: Array<{
    name: string
    input: UpdateClause[]
    expected: [string, any[]]
  }> = [
    {
      name: 'Empty UPDATE clause',
      input: [],
      expected: ['', []],
    },
    {
      name: 'Basic update',
      input: [
        {
          rule: {
            table: 'users',
            values: { name: 'John', age: 25 },
          },
        },
      ],
      expected: ['UPDATE "users" SET "age" = ?, "name" = ?', [25, 'John']],
    },
    {
      name: 'Single column update',
      input: [
        {
          rule: {
            table: 'users',
            values: { status: 'active' },
          },
        },
      ],
      expected: ['UPDATE "users" SET "status" = ?', ['active']],
    },
    {
      name: 'Raw SQL update',
      input: [
        {
          raw: {
            sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP',
          },
        },
      ],
      expected: ['UPDATE users SET last_login = CURRENT_TIMESTAMP', []],
    },
    {
      name: 'Raw SQL with bindings',
      input: [
        {
          raw: {
            sql: 'UPDATE users SET name = ?, age = ?',
            bindings: ['John', 25],
          },
        },
      ],
      expected: ['UPDATE users SET name = ?, age = ?', ['John', 25]],
    },
  ]

  testCases.forEach(({ name, input, expected }) => {
    test(name, () => {
      const result = updateUnit(input)
      expect(result).toEqual(expected)
    })
  })

  test('Error handling - Multiple UPDATE clauses', () => {
    const input: UpdateClause[] = [
      {
        rule: {
          table: 'users',
          values: { name: 'John' },
        },
      },
      {
        rule: {
          table: 'users',
          values: { age: 25 },
        },
      },
    ]
    expect(() => updateUnit(input)).toThrow(
      'Multiple UPDATE clauses are not supported',
    )
  })

  test('Error handling - Empty values object', () => {
    const input: UpdateClause[] = [
      {
        rule: {
          table: 'users',
          values: {},
        },
      },
    ]
    expect(() => updateUnit(input)).toThrow('No columns provided for UPDATE')
  })

  test('Error handling - Binding count mismatch', () => {
    const input: UpdateClause[] = [
      {
        raw: {
          sql: 'UPDATE users SET name = ?, age = ?',
          bindings: ['John'], // Only one binding provided but SQL has two placeholders
        },
      },
    ]
    expect(() => updateUnit(input)).toThrow(/SQL binding count mismatch/)
  })
}) 