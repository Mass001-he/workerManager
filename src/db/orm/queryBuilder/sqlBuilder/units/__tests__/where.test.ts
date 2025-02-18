import { whereUnit } from '../where'
import type { WhereClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('whereUnit', () => {
  test('Empty WHERE clause', () => {
    const result = whereUnit()
    expect(result).toEqual(['', []])
  })

  test('Basic equals condition', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: { id: 1 },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "id" = ?')
    expect(result[1]).toEqual([1])
  })

  test('Multiple AND conditions', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            age: { $gt: 18 },
            status: 'active',
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "age" > ? AND "status" = ?')
    expect(result[1]).toEqual([18, 'active'])
  })

  test('OR conditions', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'OR',
          conditions: {
            status: 'pending',
            age: { $lt: 20 },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "status" = ? OR "age" < ?')
    expect(result[1]).toEqual(['pending', 20])
  })

  test('Compound conditions - AND and OR combined', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: { age: { $gte: 18 } },
        },
      },
      {
        rule: {
          type: 'OR',
          conditions: {
            status: 'active',
            role: 'admin',
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "age" >= ? OR "status" = ? OR "role" = ?')
    expect(result[1]).toEqual([18, 'active', 'admin'])
  })

  test('Comparison operators', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            age: { $gt: 18 },
            score: { $gte: 60 },
            grade: { $lt: 5 },
            rank: { $lte: 100 },
            status: { $neq: 'inactive' },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe(
      'WHERE "age" > ? AND "score" >= ? AND "grade" < ? AND "rank" <= ? AND "status" != ?',
    )
    expect(result[1]).toEqual([18, 60, 5, 100, 'inactive'])
  })

  test('LIKE operators', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            name: { $like: 'John%' },
            email: { $like: '%@example.com' },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "name" LIKE ? AND "email" LIKE ?')
    expect(result[1]).toEqual(['John%', '%@example.com'])
  })

  test('IN operators', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            status: { $in: ['active', 'pending'] },
            type: { $nin: ['deleted', 'archived'] },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe(
      'WHERE "status" IN (?, ?) AND "type" NOT IN (?, ?)',
    )
    expect(result[1]).toEqual(['active', 'pending', 'deleted', 'archived'])
  })

  test('NULL operators', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            deletedAt: { $null: true },
            updatedAt: { $null: false },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "deletedAt" IS NULL AND "updatedAt" IS NOT NULL')
    expect(result[1]).toEqual([])
  })

  test('BETWEEN operators', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: {
            age: { $between: [18, 30] },
            score: { $notBetween: [0, 60] },
          },
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe(
      'WHERE "age" BETWEEN ? AND ? AND "score" NOT BETWEEN ? AND ?',
    )
    expect(result[1]).toEqual([18, 30, 0, 60])
  })

  test('Raw SQL conditions', () => {
    const clauses: WhereClause[] = [
      {
        raw: {
          type: 'AND',
          sql: 'created_at > NOW() - INTERVAL ? DAY',
          bindings: [30],
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE created_at > NOW() - INTERVAL ? DAY')
    expect(result[1]).toEqual([30])
  })

  test('Raw SQL combined with rule conditions', () => {
    const clauses: WhereClause[] = [
      {
        rule: {
          type: 'AND',
          conditions: { status: 'active' },
        },
      },
      {
        raw: {
          type: 'AND',
          sql: 'last_login > ?',
          bindings: ['2023-01-01'],
        },
      },
    ]
    const result = whereUnit(clauses)
    expect(result[0]).toBe('WHERE "status" = ? AND last_login > ?')
    expect(result[1]).toEqual(['active', '2023-01-01'])
  })
})
