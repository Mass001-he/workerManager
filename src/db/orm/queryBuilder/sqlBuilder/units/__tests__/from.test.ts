import { fromUnit } from '../from'
import type { FromClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('fromUnit', () => {
  test('Should handle simple table name correctly', () => {
    const input: FromClause[] = [{ rule: 'users' }]
    const expected: [string, any[]] = ['FROM "users"', []]
    expect(fromUnit(input)).toEqual(expected)
  })

  test('Should handle Raw SQL with bindings correctly', () => {
    const input: FromClause[] = [
      {
        raw: {
          sql: 'users JOIN profiles ON users.id = ? AND profiles.user_id = ?',
          bindings: [1, 2],
        },
      },
    ]
    const expected: [string, any[]] = [
      'FROM users JOIN profiles ON users.id = ? AND profiles.user_id = ?',
      [1, 2],
    ]
    expect(fromUnit(input)).toEqual(expected)
  })

  test('Should handle Raw SQL without bindings correctly', () => {
    const input: FromClause[] = [
      {
        raw: {
          sql: 'users JOIN profiles ON users.id = profiles.user_id',
        },
      },
    ]
    const expected: [string, any[]] = [
      'FROM users JOIN profiles ON users.id = profiles.user_id',
      [],
    ]
    expect(fromUnit(input)).toEqual(expected)
  })

  test('Empty FROM clause should throw error', () => {
    expect(() => fromUnit([])).toThrow('FROM clause is required')
  })

  test('Multiple FROM clauses should throw error', () => {
    const input: FromClause[] = [{ rule: 'users' }, { rule: 'profiles' }]
    expect(() => fromUnit(input)).toThrow(
      'Multiple FROM clauses are not supported',
    )
  })

  test('Should throw error when bindings count is less than placeholders', () => {
    const input: FromClause[] = [
      {
        raw: {
          sql: 'users JOIN profiles ON users.id = ? AND profiles.status = ?',
          bindings: [1], // Only one binding provided but SQL has two placeholders
        },
      },
    ]
    expect(() => fromUnit(input)).toThrow(/SQL binding count mismatch/)
  })

  test('Should throw error when bindings count is more than placeholders', () => {
    const input: FromClause[] = [
      {
        raw: {
          sql: 'users JOIN profiles ON users.id = ?',
          bindings: [1, 2, 3], // Three bindings provided but SQL has only one placeholder
        },
      },
    ]
    expect(() => fromUnit(input)).toThrow(/SQL binding count mismatch/)
  })

  test('Question mark in LIKE condition should not be treated as placeholder', () => {
    const input: FromClause[] = [
      {
        raw: {
          sql: "users WHERE name LIKE '%?%' AND id = ?",
          bindings: [1],
        },
      },
    ]
    expect(() => fromUnit(input)).toThrow()
  })
})
